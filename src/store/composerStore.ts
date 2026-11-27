// src/store/composerStore.ts
import { openDraft, pollFile } from "../lib/filePolling";
import { create } from "zustand";
import {
  uploadFile,
  resolveMime,
  type AttachmentUpload,
  type UploadState,
} from "../lib/upload";
import type { IndexStatus } from "../types";
import type { ReplyQuote } from "../lib/userTurn";
import { api, ApiError } from "../lib/api";
import i18n from "../i18n";
import {
  saveDraft,
  deleteDraft,
  moveDraft as moveDraftInDb,
  listDrafts,
  saveFileBlob,
  loadFileBlob,
  deleteFileBlob,
  clearUser,
  type PersistedDraft,
} from "../lib/draftDb";

export interface PastedText {
  localId: string;
  text: string;
}

interface ComposerState {
  userId: string | null;
  hydratedUserId: string | null;
  drafts: Record<
    string,
    {
      text: string;
      attachments: AttachmentUpload[];
      pastedTexts: PastedText[];
      reply?: ReplyQuote;
    }
  >;
  uploadControllers: Record<string, AbortController>;
  setUser: (userId: string) => void;
  open: (key: string) => () => void;
  setText: (key: string, text: string) => void;
  setReply: (key: string, reply: ReplyQuote | null) => void;
  setMessageContext: (
    key: string,
    pastes: string[],
    reply?: ReplyQuote,
  ) => void;
  addFiles: (
    key: string,
    files: File[],
    sessionId: string,
  ) => AttachmentUpload[];
  addPastedText: (key: string, text: string) => void;
  removeAttachment: (key: string, localId: string) => void;
  removePastedText: (key: string, localId: string) => void;
  retryAttachment: (key: string, localId: string, sessionId: string) => void;
  moveDraft: (fromKey: string, toKey: string) => void;
  clear: (key: string, opts?: { keepServerFiles?: boolean }) => void;
  reset: () => void;
}

function makeLocalId(): string {
  const g = globalThis as unknown as { crypto?: { randomUUID?: () => string } };
  return g.crypto?.randomUUID?.() ?? Math.random().toString(36).substring(7);
}

function patchAttachment(
  drafts: ComposerState["drafts"],
  key: string,
  localId: string,
  patch: Partial<AttachmentUpload>,
): ComposerState["drafts"] {
  const draft = drafts[key];
  if (!draft) return drafts;
  return {
    ...drafts,
    [key]: {
      ...draft,
      attachments: draft.attachments.map((a) =>
        a.localId === localId ? { ...a, ...patch } : a,
      ),
    },
  };
}

function removeController(
  controllers: Record<string, AbortController>,
  localId: string,
): Record<string, AbortController> {
  if (!(localId in controllers)) return controllers;
  const next = { ...controllers };
  delete next[localId];
  return next;
}

function revokeLocalUrl(att: AttachmentUpload): void {
  if (att.localUrl) {
    try {
      URL.revokeObjectURL(att.localUrl);
    } catch {
      // ignore
    }
  }
}

function deleteServerFile(fileId: string): void {
  void api.files.delete(fileId).catch((err: unknown) => {
    // eslint-disable-next-line no-console
    console.warn("failed to delete attachment from backend", err);
  });
}

function toPersistedDraft(draft: {
  text: string;
  attachments: AttachmentUpload[];
  pastedTexts: PastedText[];
  reply?: ReplyQuote;
}): PersistedDraft {
  return {
    text: draft.text,
    attachments: draft.attachments.map((a) => ({
      localId: a.localId,
      fileId: a.fileId,
      name: a.name,
      mime: a.mime,
      size: a.size,
      progress: a.progress,
      state: a.state,
      ...(a.error !== undefined ? { error: a.error } : {}),
      ...(a.indexStatus !== undefined ? { indexStatus: a.indexStatus } : {}),
      ...(a.processingDeadline !== undefined
        ? { processingDeadline: a.processingDeadline }
        : {}),
    })),
    pastedTexts: draft.pastedTexts,
    ...(draft.reply ? { reply: draft.reply } : {}),
  };
}

function persistDraft(
  userId: string | null,
  key: string,
  drafts: ComposerState["drafts"],
): void {
  if (!userId) return;
  const draft = drafts[key];
  if (
    !draft ||
    (draft.text === "" &&
      draft.attachments.length === 0 &&
      draft.pastedTexts.length === 0 &&
      !draft.reply)
  ) {
    void deleteDraft(userId, key).catch((err: unknown) => {
      // eslint-disable-next-line no-console
      console.warn("failed to delete draft from IndexedDB", err);
    });
    return;
  }
  void saveDraft(userId, key, toPersistedDraft(draft)).catch((err: unknown) => {
    // eslint-disable-next-line no-console
    console.warn("failed to persist draft to IndexedDB", err);
  });
}

function mergeAttachments(
  existing: AttachmentUpload[],
  hydrated: AttachmentUpload[],
): AttachmentUpload[] {
  if (existing.length === 0) return hydrated;
  if (hydrated.length === 0) return existing;
  const seen = new Set(existing.map((a) => a.localId));
  const extras = hydrated.filter((a) => !seen.has(a.localId));
  return extras.length > 0 ? [...existing, ...extras] : existing;
}

const hydrationPromises = new Map<string, Promise<void>>();
const POLL_TIMEOUT_MS = 120_000;

export const useComposerStore = create<ComposerState>((set, get) => {
  const pendingChecks = new Map<string, Set<string>>();
  let activeView: AbortController | undefined;
  let generation = 0;

  function startUpload(
    key: string,
    sessionId: string,
    upload: AttachmentUpload,
  ): void {
    const ac = new AbortController();
    set((s) => ({
      uploadControllers: { ...s.uploadControllers, [upload.localId]: ac },
    }));

    const persistCurrent = (): void => {
      persistDraft(get().userId, key, get().drafts);
    };

    uploadFile(
      sessionId,
      upload.file,
      (
        state: UploadState,
        progress: number,
        error?: string,
        indexStatus?: IndexStatus | null,
      ) => {
        set((s) => {
          if (!s.drafts[key]) return s;
          const current = s.drafts[key].attachments.find(
            (a) => a.localId === upload.localId,
          );
          const patch: Partial<AttachmentUpload> = {
            state,
            progress,
            error,
          };
          if (indexStatus !== undefined) patch.indexStatus = indexStatus;
          if (state === "processing") {
            patch.processingDeadline =
              current?.processingDeadline ?? Date.now() + POLL_TIMEOUT_MS;
          } else if (state === "ready" || (state === "failed" && current?.state !== "processing")) {
            patch.processingDeadline = undefined;
          }
          return {
            drafts: patchAttachment(s.drafts, key, upload.localId, patch),
          };
        });
        persistCurrent();
      },
      ac.signal,
      (fileId, mime) => {
        set((s) => ({
          drafts: patchAttachment(s.drafts, key, upload.localId, {
            fileId,
            mime,
          }),
        }));
        persistCurrent();
      },
    )
      .then((ref) => {
        set((s) => ({
          drafts: patchAttachment(s.drafts, key, upload.localId, {
            fileId: ref.id,
            mime: ref.mime,
            state: "ready" as UploadState,
            progress: 100,
            error: undefined,
            processingDeadline: undefined,
          }),
          uploadControllers: removeController(
            s.uploadControllers,
            upload.localId,
          ),
        }));
        persistCurrent();
      })
      .catch(() => {
        set((s) => ({
          uploadControllers: removeController(
            s.uploadControllers,
            upload.localId,
          ),
        }));
        persistCurrent();
      });
  }

  async function resumeProcessingPoll(
    key: string,
    localId: string,
    fileId: string,
    deadline: number,
  ): Promise<void> {
    if (get().uploadControllers[localId]) return;
    const ac = new AbortController();
    set((s) => ({
      uploadControllers: { ...s.uploadControllers, [localId]: ac },
    }));

    const finish = (patch: Partial<AttachmentUpload>): void => {
      if (get().uploadControllers[localId] !== ac || ac.signal.aborted) return;
      set((s) => {
        const draft = s.drafts[key];
        if (!draft) {
          return {
            uploadControllers: removeController(s.uploadControllers, localId),
          };
        }
        const att = draft.attachments.find((a) => a.localId === localId);
        if (!att || att.fileId !== fileId) {
          return {
            uploadControllers: removeController(s.uploadControllers, localId),
          };
        }
        return {
          drafts: patchAttachment(s.drafts, key, localId, patch),
          uploadControllers: removeController(s.uploadControllers, localId),
        };
      });
      persistDraft(get().userId, key, get().drafts);
    };

    try {
      const meta = await pollFile(key, fileId, ac.signal, deadline);
      finish(meta.status === "ready"
        ? { state: "ready", progress: 100, indexStatus: meta.indexStatus, error: undefined, processingDeadline: undefined }
        : { state: "failed", error: meta.error || i18n.t("upload.error.processingFailed"), processingDeadline: undefined });
    } catch (err) {
      const missing = err instanceof ApiError && err.status === 404;
      finish({
        state: "failed",
        error: i18n.t(missing ? "upload.error.serverExpired" : "upload.error.processingTimeout"),
        processingDeadline: missing ? undefined : deadline,
      });
    }
  }

  async function hydrateDrafts(userId: string): Promise<void> {
    const run = generation;
    let entries: Array<[string, PersistedDraft]>;
    try {
      entries = await listDrafts(userId);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("failed to list drafts from IndexedDB", err);
      if (generation === run && get().userId === userId) {
        set({ hydratedUserId: userId });
      }
      return;
    }
    if (generation !== run || get().userId !== userId) return;

    for (const [key, persisted] of entries) {
      if (generation !== run || get().userId !== userId) return;

      const attachments: AttachmentUpload[] = [];
      for (const pa of persisted.attachments) {
        let blob: Blob | null = null;
        try {
          blob = await loadFileBlob(userId, pa.localId);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn("failed to load attachment blob", pa.localId, err);
        }
        if (generation !== run) {
          attachments.forEach(revokeLocalUrl);
          return;
        }
        const file = blob
          ? new File([blob], pa.name, { type: pa.mime })
          : new File([], pa.name, { type: pa.mime });
        const localUrl =
          blob && pa.mime.startsWith("image/")
            ? URL.createObjectURL(blob)
            : undefined;
        attachments.push({
          localId: pa.localId,
          fileId: pa.fileId,
          name: pa.name,
          mime: pa.mime,
          size: pa.size,
          progress: pa.progress,
          state: pa.state,
          ...(pa.error !== undefined ? { error: pa.error } : {}),
          ...(pa.indexStatus !== undefined
            ? { indexStatus: pa.indexStatus }
            : {}),
          ...(pa.processingDeadline !== undefined
            ? { processingDeadline: pa.processingDeadline }
            : {}),
          file,
          ...(localUrl ? { localUrl } : {}),
        });
      }

      set((s) => {
        if (s.userId !== userId) return s;
        const existing = s.drafts[key];
        const merged = existing
          ? {
              text: existing.text || persisted.text,
              pastedTexts:
                existing.pastedTexts.length > 0
                  ? existing.pastedTexts
                  : persisted.pastedTexts,
              attachments: mergeAttachments(existing.attachments, attachments),
              ...(existing.reply
                ? { reply: existing.reply }
                : persisted.reply
                  ? { reply: persisted.reply }
                  : {}),
            }
          : {
              text: persisted.text,
              pastedTexts: persisted.pastedTexts,
              attachments,
              ...(persisted.reply ? { reply: persisted.reply } : {}),
            };
        return { drafts: { ...s.drafts, [key]: merged } };
      });

      const ids = new Set(attachments.map(a => a.localId));
      if (ids.size) pendingChecks.set(key, ids);
    }

    if (generation === run && get().userId === userId) {
      set({ hydratedUserId: userId });
    }
  }

  async function reconcileDraft(userId: string, key: string, signal: AbortSignal) {
    if (get().hydratedUserId !== userId) await startHydration(userId);
    if (signal.aborted || get().userId !== userId) return;
    const ids = pendingChecks.get(key);
    if (!ids) return;
    for (const localId of ids) {
      if (signal.aborted) return;
      const att = get().drafts[key]?.attachments.find(a => a.localId === localId);
      if (!att || get().uploadControllers[localId]) {
        ids.delete(localId);
        continue;
      }
      if (!att.fileId) {
        if (att.state !== "ready") {
          set((s) => ({
            drafts: patchAttachment(s.drafts, key, att.localId, {
              state: "failed",
              error: i18n.t("upload.error.localMissing"),
              processingDeadline: undefined,
            }),
          }));
          persistDraft(userId, key, get().drafts);
        }
        ids.delete(localId);
        continue;
      }
      const fileId = att.fileId;
      try {
        const meta = (await api.files.get(fileId, signal)) as {
          status: string;
          error?: string | null;
          indexStatus?: IndexStatus | null;
        };
        if (signal.aborted || get().userId !== userId) return;
        if (!ids.has(localId) || get().uploadControllers[localId]) continue;
        if (meta.status === "ready") {
          set((s) => ({
            drafts: patchAttachment(s.drafts, key, att.localId, {
              state: "ready",
              progress: 100,
              indexStatus: meta.indexStatus ?? null,
              error: undefined,
              processingDeadline: undefined,
            }),
          }));
          persistDraft(userId, key, get().drafts);
        } else if (meta.status === "failed") {
          set((s) => ({
            drafts: patchAttachment(s.drafts, key, att.localId, {
              state: "failed",
              error: meta.error || i18n.t("upload.error.processingFailed"),
              processingDeadline: undefined,
            }),
          }));
          persistDraft(userId, key, get().drafts);
        } else if (meta.status === "processing") {
          const current = get().drafts[key]?.attachments.find(
            (a) => a.localId === att.localId,
          );
          const deadline =
            current?.processingDeadline ??
            att.processingDeadline ??
            Date.now() + POLL_TIMEOUT_MS;
          if (Date.now() >= deadline) {
            set((s) => ({
              drafts: patchAttachment(s.drafts, key, att.localId, {
                state: "failed",
                error: i18n.t("upload.error.processingTimeout"),
                processingDeadline: deadline,
              }),
            }));
            persistDraft(userId, key, get().drafts);
          } else {
            set((s) => ({
              drafts: patchAttachment(s.drafts, key, att.localId, {
                state: "processing",
                progress: 100,
                indexStatus: meta.indexStatus ?? null,
                processingDeadline: deadline,
                error: undefined,
              }),
            }));
            persistDraft(userId, key, get().drafts);
            void resumeProcessingPoll(key, att.localId, fileId, deadline);
          }
        } else {
          set((s) => ({
            drafts: patchAttachment(s.drafts, key, att.localId, {
              state: "failed",
              error: i18n.t("upload.error.pendingRetry"),
              processingDeadline: undefined,
            }),
          }));
          persistDraft(userId, key, get().drafts);
        }
      } catch (err) {
        if (signal.aborted || get().userId !== userId) return;
        if (!ids.has(localId) || get().uploadControllers[localId]) continue;
        const is404 = err instanceof ApiError && err.status === 404;
        set((s) => ({
          drafts: patchAttachment(s.drafts, key, att.localId, {
            state: "failed",
            error: is404
              ? i18n.t("upload.error.serverExpired")
              : i18n.t("upload.error.networkCheck"),
            ...(is404 ? { processingDeadline: undefined } : {}),
          }),
        }));
        persistDraft(userId, key, get().drafts);
      }
      ids.delete(localId);
    }
    pendingChecks.delete(key);
  }

  function startHydration(userId: string): Promise<void> {
    const existing = hydrationPromises.get(userId);
    if (existing) return existing;
    const p = hydrateDrafts(userId).finally(() => {
      if (hydrationPromises.get(userId) === p) {
        hydrationPromises.delete(userId);
      }
    });
    hydrationPromises.set(userId, p);
    return p;
  }

  return {
    userId: null,
    hydratedUserId: null,
    drafts: {},
    uploadControllers: {},

    setUser: (userId) => {
      const current = get();
      if (current.userId === userId) {
        if (current.hydratedUserId === userId) return;
        void startHydration(userId);
        return;
      }
      current.reset();
      set({ userId, hydratedUserId: null });
      void startHydration(userId);
    },

    open: (key) => {
      const view = openDraft(key);
      activeView = view;
      const userId = get().userId;
      if (userId) void reconcileDraft(userId, key, view.signal).catch(err => {
        if (!view.signal.aborted) console.warn("Failed to check draft attachments", err);
      });
      return () => view.abort();
    },

    setText: (key, text) => {
      set((s) => {
        const existing = s.drafts[key];
        return {
          drafts: {
            ...s.drafts,
            [key]: {
              ...existing,
              attachments: existing?.attachments ?? [],
              pastedTexts: existing?.pastedTexts ?? [],
              text,
            },
          },
        };
      });
      persistDraft(get().userId, key, get().drafts);
    },

    setReply: (key, reply) => {
      set((s) => {
        const current = s.drafts[key] ?? {
          text: "",
          attachments: [],
          pastedTexts: [],
        };

        const next = { ...current };

        if (reply) next.reply = reply;
        else delete next.reply;

        return { drafts: { ...s.drafts, [key]: next } };
      });
      persistDraft(get().userId, key, get().drafts);
    },

    setMessageContext: (key, pastes, reply) => {
      set((s) => {
        const current = s.drafts[key] ?? {
          text: "",
          attachments: [],
          pastedTexts: [],
        };

        const next = {
          ...current,
          pastedTexts: pastes.map((text) => ({
            localId: makeLocalId(),
            text,
          })),
        };

        if (reply) next.reply = reply;
        else delete next.reply;

        return { drafts: { ...s.drafts, [key]: next } };
      });
      persistDraft(get().userId, key, get().drafts);
    },

    addFiles: (key, files, sessionId) => {
      if (files.length === 0) return [];
      const draft = get().drafts[key] || {
        text: "",
        attachments: [],
        pastedTexts: [],
      };
      const newUploads: AttachmentUpload[] = files.map((file) => {
        const mime = resolveMime(file);
        return {
          localId: makeLocalId(),
          fileId: null,
          name: file.name,
          mime,
          size: file.size,
          localUrl: mime.startsWith("image/")
            ? URL.createObjectURL(file)
            : undefined,
          file,
          progress: 0,
          state: "queued" as UploadState,
        };
      });

      set((s) => ({
        drafts: {
          ...s.drafts,
          [key]: {
            ...draft,
            attachments: [...draft.attachments, ...newUploads],
          },
        },
      }));
      persistDraft(get().userId, key, get().drafts);

      const userId = get().userId;
      newUploads.forEach((upload) => {
        if (userId) {
          saveFileBlob(userId, upload.localId, upload.file)
            .catch((err) => {
              // eslint-disable-next-line no-console
              console.warn("failed to persist attachment blob", err);
            })
            .finally(() => startUpload(key, sessionId, upload));
        } else {
          startUpload(key, sessionId, upload);
        }
      });

      return newUploads;
    },

    addPastedText: (key, text) => {
      set((s) => {
        const draft = s.drafts[key] || {
          text: "",
          attachments: [],
          pastedTexts: [],
        };
        return {
          drafts: {
            ...s.drafts,
            [key]: {
              ...draft,
              pastedTexts: [
                ...draft.pastedTexts,
                { localId: makeLocalId(), text },
              ],
            },
          },
        };
      });
      persistDraft(get().userId, key, get().drafts);
    },

    removePastedText: (key, localId) => {
      set((s) => {
        const d = s.drafts[key];
        if (!d) return s;
        return {
          drafts: {
            ...s.drafts,
            [key]: {
              ...d,
              pastedTexts: d.pastedTexts.filter((p) => p.localId !== localId),
            },
          },
        };
      });
      persistDraft(get().userId, key, get().drafts);
    },

    removeAttachment: (key, localId) => {
      pendingChecks.get(key)?.delete(localId);
      const draft = get().drafts[key];
      const attachment = draft?.attachments.find((a) => a.localId === localId);

      const ctrl = get().uploadControllers[localId];
      if (ctrl) {
        ctrl.abort();
        set((s) => ({
          uploadControllers: removeController(s.uploadControllers, localId),
        }));
      }

      if (attachment?.fileId) {
        deleteServerFile(attachment.fileId);
      }
      if (attachment) {
        revokeLocalUrl(attachment);
      }

      set((s) => {
        const d = s.drafts[key];
        if (!d) return s;
        return {
          drafts: {
            ...s.drafts,
            [key]: {
              ...d,
              attachments: d.attachments.filter((a) => a.localId !== localId),
            },
          },
        };
      });

      const userId = get().userId;
      if (userId) {
        void deleteFileBlob(userId, localId);
      }
      persistDraft(userId, key, get().drafts);
    },

    retryAttachment: (key, localId, sessionId) => {
      pendingChecks.get(key)?.delete(localId);
      const draft = get().drafts[key];
      const attachment = draft?.attachments.find((a) => a.localId === localId);
      if (!attachment) return;
      const file = attachment.file;
      const fileId = attachment.fileId;
      const hasRealFile = !!file && file.size > 0;

      const markLocalMissing = (): void => {
        set((s) => ({
          drafts: patchAttachment(s.drafts, key, localId, {
            state: "failed",
            error: i18n.t("upload.error.localMissing"),
            processingDeadline: undefined,
          }),
        }));
        persistDraft(get().userId, key, get().drafts);
      };

      const setFailed = (error: string, clearDeadline = true): void => {
        set((s) => ({
          drafts: patchAttachment(s.drafts, key, localId, {
            state: "failed",
            error,
            ...(clearDeadline ? { processingDeadline: undefined } : {}),
          }),
        }));
        persistDraft(get().userId, key, get().drafts);
      };

      const beginReupload = (): void => {
        if (!hasRealFile) {
          markLocalMissing();
          return;
        }
        const ctrl = get().uploadControllers[localId];
        if (ctrl) {
          ctrl.abort();
          set((s) => ({
            uploadControllers: removeController(s.uploadControllers, localId),
          }));
        }
        set((s) => ({
          drafts: patchAttachment(s.drafts, key, localId, {
            fileId: null,
            progress: 0,
            state: "queued",
            error: undefined,
            indexStatus: undefined,
            processingDeadline: undefined,
          }),
        }));
        persistDraft(get().userId, key, get().drafts);
        const resetUpload: AttachmentUpload = {
          ...attachment,
          fileId: null,
          progress: 0,
          state: "queued",
          error: undefined,
          indexStatus: undefined,
          processingDeadline: undefined,
        };
        startUpload(key, sessionId, resetUpload);
      };

      if (!fileId) {
        beginReupload();
        return;
      }

      void (async () => {
        const existingCtrl = get().uploadControllers[localId];
        if (existingCtrl) {
          existingCtrl.abort();
          set((s) => ({
            uploadControllers: removeController(s.uploadControllers, localId),
          }));
        }

        try {
          const meta = (await api.files.get(fileId)) as {
            status: string;
            error?: string | null;
            indexStatus?: IndexStatus | null;
          };
          if (meta.status === "ready") {
            set((s) => ({
              drafts: patchAttachment(s.drafts, key, localId, {
                state: "ready",
                progress: 100,
                indexStatus: meta.indexStatus ?? null,
                error: undefined,
                processingDeadline: undefined,
              }),
            }));
            persistDraft(get().userId, key, get().drafts);
            return;
          }
          if (meta.status === "processing") {
            // An explicit retry starts a fresh bounded polling window.
            const deadline = Date.now() + POLL_TIMEOUT_MS;
            set((s) => ({
              drafts: patchAttachment(s.drafts, key, localId, {
                state: "processing",
                progress: 100,
                indexStatus: meta.indexStatus ?? null,
                processingDeadline: deadline,
                error: undefined,
              }),
            }));
            persistDraft(get().userId, key, get().drafts);
            void resumeProcessingPoll(key, localId, fileId, deadline);
            return;
          }
          if (meta.status === "pending") {
            try {
              const completed = (await api.files.complete(fileId)) as {
                status: string;
                indexStatus?: IndexStatus | null;
              };
              if (completed.status === "ready") {
                set((s) => ({
                  drafts: patchAttachment(s.drafts, key, localId, {
                    state: "ready",
                    progress: 100,
                    indexStatus: completed.indexStatus ?? null,
                    error: undefined,
                    processingDeadline: undefined,
                  }),
                }));
                persistDraft(get().userId, key, get().drafts);
                return;
              }
              const deadline = Date.now() + POLL_TIMEOUT_MS;
              set((s) => ({
                drafts: patchAttachment(s.drafts, key, localId, {
                  state: "processing",
                  progress: 100,
                  processingDeadline: deadline,
                  error: undefined,
                }),
              }));
              persistDraft(get().userId, key, get().drafts);
              void resumeProcessingPoll(key, localId, fileId, deadline);
              return;
            } catch (err) {
              if (err instanceof ApiError && err.status === 404) {
                beginReupload();
                return;
              }
              setFailed(i18n.t("upload.error.pendingRetry"), false);
              return;
            }
          }
          if (meta.status === "failed") {
            beginReupload();
            return;
          }
          setFailed(i18n.t("upload.error.generic"));
        } catch (err) {
          if (err instanceof ApiError && err.status === 404) {
            beginReupload();
            return;
          }
          setFailed(i18n.t("upload.error.networkCheck"), false);
        }
      })();
    },

    moveDraft: (fromKey, toKey) => {
      if (fromKey === toKey) return;
      const userId = get().userId;
      set((s) => {
        const fromDraft = s.drafts[fromKey];
        if (!fromDraft) return s;
        const existing = s.drafts[toKey];
        const merged = existing
          ? {
              text: existing.text || fromDraft.text,
              pastedTexts:
                existing.pastedTexts.length > 0
                  ? existing.pastedTexts
                  : fromDraft.pastedTexts,
              attachments: mergeAttachments(
                existing.attachments,
                fromDraft.attachments,
              ),
              ...(existing.reply
                ? { reply: existing.reply }
                : fromDraft.reply
                  ? { reply: fromDraft.reply }
                  : {}),
            }
          : fromDraft;
        const next = { ...s.drafts };
        delete next[fromKey];
        next[toKey] = merged;
        return { drafts: next };
      });
      if (userId) {
        void moveDraftInDb(userId, fromKey, toKey).catch((err) => {
          // eslint-disable-next-line no-console
          console.warn("failed to move draft in IndexedDB", err);
        });
      }
    },

    clear: (key, opts) => {
      pendingChecks.get(key)?.clear();
      const keepServerFiles = opts?.keepServerFiles === true;
      const draft = get().drafts[key];
      const userId = get().userId;
      if (draft) {
        draft.attachments.forEach((a) => {
          const ctrl = get().uploadControllers[a.localId];
          if (ctrl) ctrl.abort();
          if (!keepServerFiles && a.fileId) {
            deleteServerFile(a.fileId);
          }
          if (userId) {
            void deleteFileBlob(userId, a.localId).catch((err) => {
              // eslint-disable-next-line no-console
              console.warn("failed to delete attachment blob", err);
            });
          }
        });
      }
      set((s) => ({
        drafts: {
          ...s.drafts,
          [key]: { text: "", attachments: [], pastedTexts: [] },
        },
      }));
      if (userId) {
        void deleteDraft(userId, key).catch((err) => {
          // eslint-disable-next-line no-console
          console.warn("failed to delete draft from IndexedDB", err);
        });
      }
    },

    reset: () => {
      generation++;
      activeView?.abort();
      pendingChecks.clear();
      hydrationPromises.clear();
      const state = get();
      const userId = state.userId;
      Object.values(state.uploadControllers).forEach((c) => {
        try {
          c.abort();
        } catch {
          // ignore
        }
      });
      Object.values(state.drafts).forEach((draft) => {
        draft.attachments.forEach(revokeLocalUrl);
      });
      set({
        drafts: {},
        uploadControllers: {},
        userId: null,
        hydratedUserId: null,
      });
      if (userId) {
        void clearUser(userId).catch((err) => {
          // eslint-disable-next-line no-console
          console.warn("failed to clear drafts from IndexedDB", err);
        });
      }
    },
  };
});
