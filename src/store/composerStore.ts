// src/store/composerStore.ts
// REPLACE: imports + interface
import { create } from "zustand";
import {
  uploadFile,
  resolveMime,
  type AttachmentUpload,
  type UploadState,
} from "../lib/upload";
import type { IndexStatus } from "../types";
import type { ReplyQuote } from "../lib/userTurn";
import { api } from "../lib/api";

export interface PastedText {
  localId: string;
  text: string;
}

interface ComposerState {
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
  setText: (key: string, text: string) => void;
  setReply: (key: string, reply: ReplyQuote | null) => void;
  setMessageContext: (
    key: string,
    pastes: string[],
    reply?: ReplyQuote,
  ) => void;
  addFiles: (key: string, files: File[], sessionId: string) => void;
  addPastedText: (key: string, text: string) => void;
  removeAttachment: (key: string, localId: string) => void;
  removePastedText: (key: string, localId: string) => void;
  retryAttachment: (key: string, localId: string, sessionId: string) => void;
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

export const useComposerStore = create<ComposerState>((set, get) => {
  function startUpload(
    key: string,
    sessionId: string,
    upload: AttachmentUpload,
  ): void {
    const ac = new AbortController();
    set((s) => ({
      uploadControllers: { ...s.uploadControllers, [upload.localId]: ac },
    }));

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
          return {
            drafts: patchAttachment(s.drafts, key, upload.localId, {
              state,
              progress,
              ...(error !== undefined ? { error } : {}),
              ...(indexStatus !== undefined ? { indexStatus } : {}),
            }),
          };
        });
      },
      ac.signal,
    )
      .then((ref) => {
        set((s) => ({
          drafts: patchAttachment(s.drafts, key, upload.localId, {
            fileId: ref.id,
            mime: ref.mime,
            state: "ready" as UploadState,
            progress: 100,
          }),
          uploadControllers: removeController(
            s.uploadControllers,
            upload.localId,
          ),
        }));
      })
      .catch(() => {
        set((s) => ({
          uploadControllers: removeController(
            s.uploadControllers,
            upload.localId,
          ),
        }));
      });
  }

  return {
    drafts: {},
    uploadControllers: {},

    setText: (key, text) =>
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
      }),

    setReply: (key, reply) =>
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
      }),

    setMessageContext: (key, pastes, reply) =>
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
      }),

    addFiles: (key, files, sessionId) => {
      if (files.length === 0) return;
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

      newUploads.forEach((upload) => startUpload(key, sessionId, upload));
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
    },

    removeAttachment: (key, localId) => {
      const draft = get().drafts[key];
      const attachment = draft?.attachments.find((a) => a.localId === localId);

      const ctrl = get().uploadControllers[localId];
      if (ctrl) {
        ctrl.abort();
        set((s) => ({
          uploadControllers: removeController(s.uploadControllers, localId),
        }));
      }

      // File sudah dibuat di server (presign selesai) — hapus apa pun
      // state-nya (uploading/completing/processing/ready/failed) agar
      // tidak jadi orphan sampai sweep cleanup 1 jam.
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
    },

    retryAttachment: (key, localId, sessionId) => {
      const draft = get().drafts[key];
      const attachment = draft?.attachments.find((a) => a.localId === localId);
      if (!attachment) return;
      const file = attachment.file;
      get().removeAttachment(key, localId);
      get().addFiles(key, [file], sessionId);
    },

    clear: (key, opts) => {
      const keepServerFiles = opts?.keepServerFiles === true;
      const draft = get().drafts[key];
      if (draft) {
        draft.attachments.forEach((a) => {
          const ctrl = get().uploadControllers[a.localId];
          if (ctrl) ctrl.abort();
          if (!keepServerFiles && a.fileId) {
            deleteServerFile(a.fileId);
          }
        });
      }
      set((s) => ({
        drafts: {
          ...s.drafts,
          [key]: { text: "", attachments: [], pastedTexts: [] },
        },
      }));
    },

    /**
     * Reset total. Abort semua upload + revoke blob URLs. Dipakai saat
     * logout untuk membersihkan state antar-user.
     */
    reset: () => {
      const state = get();
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
      set({ drafts: {}, uploadControllers: {} });
    },
  };
});
