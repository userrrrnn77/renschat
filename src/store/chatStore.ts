// src/store/chatStore.ts

import { create } from "zustand";
import { matchPath } from "react-router";
import { useUIStore } from "./uiStore";
import { useToastStore } from "./toastStore";
import { api, ApiError, fetchApi, fetchApiResponse } from "../lib/api";
import { parseSse } from "../lib/sse";
import type {
  ChatMessage,
  GenerationInput,
  MediaProgress,
  PendingClarification,
  ServerMessage,
  StreamPhase,
} from "../types";
import { useSessionsStore } from "./sessionsStore";
import { useComposerStore } from "./composerStore";
import { decodeUserTurn } from "../lib/userTurn";

async function readChatHttpError(
  res: Response,
): Promise<{ code: string; message: string }> {
  const fallback = {
    code: `HTTP_${res.status}`,
    message: `Permintaan chat gagal (HTTP ${res.status}).`,
  };

  try {
    const payload = await res.json();
    const error = payload?.error;

    return {
      code:
        typeof error?.code === "string" && error.code.trim()
          ? error.code
          : fallback.code,
      message:
        typeof error?.message === "string" && error.message.trim()
          ? error.message
          : fallback.message,
    };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw err;
    return fallback;
  }
}

export interface EditingMessage {
  messageId: string;
  text: string;
}

interface ChatState {
  bySession: Record<
    string,
    {
      messages: ChatMessage[];
      nextCursor: string | null;
      loaded: boolean;
      loading: boolean;
      olderRequest?: symbol | null;
      streaming: boolean;
      phase: StreamPhase;
      pendingClarification: PendingClarification | null;
    }
  >;
  controllers: Record<string, AbortController>;
  editingBySession: Record<string, EditingMessage | undefined>;
  open: (id: string) => Promise<void>;
  loadOlder: (id: string) => Promise<void>;
  send: (
    id: string,
    text: string,
    attachments: Array<{
      id: string;
      name: string;
      mime: string;
      size: number;
      localUrl?: string;
    }>,
    generation?: GenerationInput,
    editOfMessageId?: string,
  ) => Promise<void>;
  regenerate: (id: string, messageId: string) => Promise<void>;
  stop: (id: string) => void;
  respond: (
    sessionId: string,
    questionId: string,
    answer: string[],
  ) => Promise<void>;
  startEdit: (sessionId: string, messageId: string, text: string) => void;
  cancelEdit: (sessionId: string) => void;
  reset: () => void;
}

type SetChatState = (
  partial: Partial<ChatState> | ((s: ChatState) => Partial<ChatState>),
) => void;

function mapServerMessage(m: ServerMessage): ChatMessage {
  return {
    id: m.id,
    role: m.role === "user" ? "user" : "assistant",
    blocks: m.blocks,
    status: m.status,
    ...(m.attachments?.length ? { attachments: m.attachments } : {}),
    ...(m.status === "error" && m.errorCode
      ? { error: { code: m.errorCode, message: m.errorCode } }
      : {}),
    createdAt: m.createdAt,
    ...(m.sources !== undefined ? { sources: m.sources } : {}),
    ...(m.truncated ? { truncated: true } : {}),
  };
}

type Ticket = { request: string; user: string; assistant: string };
const tickets = new Map<string, Ticket>();
const storageKey = (id: string) => "renschat.turn." + id;
function ticket(id: string): Ticket | undefined {
  if (tickets.has(id)) return tickets.get(id);
  try {
    return (
      JSON.parse(sessionStorage.getItem(storageKey(id)) ?? "null") ?? undefined
    );
  } catch {
    return undefined;
  }
}
function remember(id: string, value?: Ticket) {
  if (value) tickets.set(id, value);
  else tickets.delete(id);
  try {
    if (value) sessionStorage.setItem(storageKey(id), JSON.stringify(value));
    else sessionStorage.removeItem(storageKey(id));
  } catch {
    /* private browsing still supports in-memory recovery */
  }
}
type Snapshot = {
  state: string;
  messageId: string;
  userMessageId: string;
  question:
    | (Omit<PendingClarification, "timeoutMs" | "receivedAt"> & {
        expiresAt: string;
      })
    | null;
};
async function recover(
  set: SetChatState,
  get: () => ChatState,
  id: string,
  item: Ticket,
  ac: AbortController,
) {
  const pause = () => new Promise((resolve) => setTimeout(resolve, 1500));
  let missing = 0;
  while (!ac.signal.aborted && get().controllers[id] === ac) {
    try {
      const run = await fetchApi<Snapshot>(
        `/sessions/${id}/turns/${item.request}`,
        { signal: ac.signal },
      );
      const terminal = ["done", "error", "aborted", "interrupted"].includes(
        run.state,
      );
      const pair = terminal
        ? await fetchApi<{ messages: ServerMessage[] }>(
            `/sessions/${id}?pair=${run.userMessageId},${run.messageId}`,
            { signal: ac.signal },
          )
        : null;
      if (ac.signal.aborted || get().controllers[id] !== ac) return;
      const history = pair?.messages.map(mapServerMessage) ?? [];
      set((s) => {
        const session = s.bySession[id];
        if (!session) return {};
        const messages = session.messages.filter(
          (m) =>
            ![
              item.assistant,
              run.messageId,
              item.user,
              run.userMessageId,
            ].includes(m.id),
        );
        const oldUser = session.messages.find(
          (m) => m.id === item.user || m.id === run.userMessageId,
        );
        const oldAssistant = session.messages.find(
          (m) => m.id === item.assistant || m.id === run.messageId,
        );
        const user = history.find((m) => m.role === "user") ?? oldUser;
        if (user) messages.push({ ...user, id: run.userMessageId });
        const assistant: ChatMessage = history.find(
          (m) => m.role === "assistant",
        ) ?? {
          ...oldAssistant,
          id: run.messageId,
          role: "assistant",
          blocks: oldAssistant?.blocks ?? [],
          createdAt: oldAssistant?.createdAt ?? new Date().toISOString(),
          status: terminal
            ? run.state === "aborted"
              ? "aborted"
              : "error"
            : "streaming",
          ...(terminal && run.state !== "aborted"
            ? { error: { code: "DISCONNECTED", message: "Jawaban terputus." } }
            : {}),
        };
        messages.push(assistant);
        if (pair)
          messages.sort(
            (left, right) =>
              Date.parse(left.createdAt) - Date.parse(right.createdAt),
          );
        const now = Date.now();
        return {
          bySession: {
            ...s.bySession,
            [id]: {
              ...session,
              messages,
              streaming: !terminal,
              pendingClarification: run.question
                ? {
                    ...run.question,
                    receivedAt: now,
                    timeoutMs: Math.max(
                      0,
                      Date.parse(run.question.expiresAt) - now,
                    ),
                  }
                : null,
            },
          },
        };
      });
      if (terminal) {
        remember(id);
        return;
      }
    } catch (err) {
      if (ac.signal.aborted) return;
      if (
        err instanceof ApiError &&
        (err.status === 401 ||
          err.status === 403 ||
          (err.status === 404 && ++missing >= 4))
      ) {
        remember(id);
        set((s) =>
          updateAssistantMessage(s, id, item.assistant, {
            status: "error",
            error: {
              code: "DISCONNECTED",
              message: "Status jawaban tidak tersedia.",
            },
          }),
        );
        useToastStore
          .getState()
          .push("error", "Status jawaban tidak tersedia.");
        return;
      }
    }
    await pause();
  }
}

// ── Media job reconciliation ────────────────────────────────────────
// Poll `GET /api/jobs/:id` only after a `media.progress` event delivered a
// non-empty `jobId`. Stop on terminal status, endpoint error, session/message
// disappearance, or user reset. Never reconstruct image/video blocks from
// the job payload — the block output still comes from the stream or the
// final turn reconcile.

interface JobPoller {
  cancelled: boolean;
}

const jobPollers = new Map<string, JobPoller>();

function stopJobPollersForSession(sessionId: string): void {
  for (const [key, poller] of Array.from(jobPollers.entries())) {
    if (key.startsWith(`${sessionId}:`)) {
      poller.cancelled = true;
      jobPollers.delete(key);
    }
  }
}

function stopAllJobPollers(): void {
  for (const [key, poller] of Array.from(jobPollers.entries())) {
    poller.cancelled = true;
    jobPollers.delete(key);
  }
}

const JOB_POLL_INTERVAL_MS = 3000;
const JOB_POLL_MAX_MS = 5 * 60_000;

function ensureJobPolling(
  set: SetChatState,
  get: () => ChatState,
  sessionId: string,
  messageId: string,
  progress: MediaProgress,
): void {
  const jobId = progress.jobId;
  if (!jobId) return;

  const terminal =
    progress.status === "succeeded" ||
    progress.status === "failed" ||
    progress.status === "cancelled";
  if (terminal) return;

  const key = `${sessionId}:${jobId}`;
  if (jobPollers.has(key)) return;

  const poller: JobPoller = { cancelled: false };
  jobPollers.set(key, poller);

  const tick = async (): Promise<void> => {
    const startedAt = Date.now();
    while (!poller.cancelled) {
      await new Promise((r) => setTimeout(r, JOB_POLL_INTERVAL_MS));
      if (poller.cancelled) return;
      if (Date.now() - startedAt > JOB_POLL_MAX_MS) {
        jobPollers.delete(key);
        return;
      }

      const session = get().bySession[sessionId];
      if (!session) {
        jobPollers.delete(key);
        return;
      }
      const message = session.messages.find((m) => m.id === messageId);
      if (!message) {
        jobPollers.delete(key);
        return;
      }

      let job;
      try {
        job = await api.jobs.get(jobId);
      } catch {
        // Any endpoint error stops this poller — no infinite retry.
        jobPollers.delete(key);
        return;
      }
      if (poller.cancelled) return;

      const jobTerminal =
        job.status === "succeeded" ||
        job.status === "failed" ||
        job.status === "cancelled";

      set((s) => {
        const cur = s.bySession[sessionId];
        if (!cur) return s;
        return {
          bySession: {
            ...s.bySession,
            [sessionId]: {
              ...cur,
              messages: cur.messages.map((m) =>
                m.id === messageId
                  ? {
                      ...m,
                      mediaProgress: {
                        jobId,
                        engine: job.engine,
                        kind: job.kind,
                        status: job.status,
                        ...(job.error?.message
                          ? { message: job.error.message }
                          : {}),
                      },
                    }
                  : m,
              ),
            },
          },
        };
      });

      if (jobTerminal) {
        jobPollers.delete(key);
        return;
      }
    }
  };
  void tick();
}

export const useChatStore = create<ChatState>((set, get) => ({
  bySession: {},
  controllers: {},
  editingBySession: {},

  open: async (id) => {
    if (get().bySession[id]?.loaded) return;

    set((s) => ({
      bySession: {
        ...s.bySession,
        [id]: {
          messages: [],
          nextCursor: null,
          loaded: false,
          loading: true,
          streaming: false,
          phase: null,
          pendingClarification: null,
        },
      },
    }));

    try {
      const data = await fetchApi<{
        messages: ServerMessage[];
        nextCursor: string | null;
      }>(`/sessions/${id}?limit=50`);
      const mappedMessages: ChatMessage[] = data.messages.map(mapServerMessage);

      set((s) => ({
        bySession: {
          ...s.bySession,
          [id]: {
            messages: mappedMessages,
            nextCursor: data.nextCursor,
            loaded: true,
            loading: false,
            streaming: false,
            phase: null,
            pendingClarification: null,
          },
        },
      }));
      const pending = ticket(id);
      if (pending && !get().controllers[id]) {
        const ac = new AbortController();
        set((s) => ({ controllers: { ...s.controllers, [id]: ac } }));
        try {
          await recover(set, get, id, pending, ac);
        } finally {
          if (get().controllers[id] === ac) finalizeStream(set, id);
        }
      }
    } catch {
      set((s) => ({
        bySession: {
          ...s.bySession,
          [id]: { ...s.bySession[id], loading: false },
        },
      }));
    }
  },

  loadOlder: async (id) => {
    const session = get().bySession[id];
    if (!session?.nextCursor || session.loading) return;

    const request = Symbol();
    const cursor = session.nextCursor;

    set((s) => ({
      bySession: {
        ...s.bySession,
        [id]: { ...session, loading: true, olderRequest: request },
      },
    }));

    try {
      const data = await fetchApi<{
        messages: ServerMessage[];
        nextCursor: string | null;
      }>(`/sessions/${id}?limit=50&cursor=${encodeURIComponent(cursor)}`);

      const older = data.messages.map(mapServerMessage);

      set((s) => {
        const current = s.bySession[id];
        if (current?.olderRequest !== request) return s;

        const existingIds = new Set(current.messages.map((m) => m.id));
        const missing = older.filter((m) => !existingIds.has(m.id));

        return {
          bySession: {
            ...s.bySession,
            [id]: {
              ...current,
              messages: [...missing, ...current.messages],
              nextCursor: data.nextCursor,
              loading: false,
              olderRequest: null,
            },
          },
        };
      });
    } catch {
      set((s) => {
        const current = s.bySession[id];
        if (current?.olderRequest !== request) return s;

        return {
          bySession: {
            ...s.bySession,
            [id]: { ...current, loading: false, olderRequest: null },
          },
        };
      });
    }
  },

  send: async (sessionId, text, attachments, generation, editOfMessageId) => {
    if (get().controllers[sessionId]) return;
    const ac = new AbortController();
    const tempUserId = `tmp-u-${Date.now()}`;
    const tempAssistantId = `tmp-a-${Date.now()}`;
    const assistantIdRef = { current: tempAssistantId };

    set((s) => {
      const existing = s.bySession[sessionId];
      const messages = [...(existing?.messages ?? [])];

      if (editOfMessageId) {
        const idx = messages.findIndex((m) => m.id === editOfMessageId);
        if (idx >= 0) {
          messages[idx] = {
            ...messages[idx],
            blocks: [{ type: "text", markdown: text }],
            attachments,
          };
          messages.splice(idx + 1);
        }
      } else {
        messages.push({
          id: tempUserId,
          role: "user",
          blocks: [{ type: "text", markdown: text }],
          status: "done",
          createdAt: new Date().toISOString(),
          attachments,
        });
      }

      messages.push({
        id: tempAssistantId,
        role: "assistant",
        blocks: [],
        status: "streaming",
        createdAt: new Date().toISOString(),
      });

      return {
        controllers: { ...s.controllers, [sessionId]: ac },
        bySession: {
          ...s.bySession,
          [sessionId]: {
            ...(existing ?? {
              messages: [],
              nextCursor: null,
              loaded: true,
              loading: false,
            }),
            streaming: true,
            phase: null,
            pendingClarification: null,
            messages,
          },
        },
      };
    });

    const requestId = editOfMessageId ? undefined : crypto.randomUUID();
    const pending = requestId
      ? { request: requestId, user: tempUserId, assistant: tempAssistantId }
      : undefined;
    if (pending) remember(sessionId, pending);
    try {
      const body = JSON.stringify({
        text,
        attachmentIds: attachments.map((a) => a.id),
        generation,
        editOfMessageId,
        requestId,
        detachable: Boolean(requestId),
      });

      const deliver = async (): Promise<boolean> => {
        const res = await fetchApiResponse(`/sessions/${sessionId}/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream, application/json",
          },
          body,
          signal: ac.signal,
        });

        if (!res.ok) {
          const error = await readChatHttpError(res);
          if (pending && res.status < 500) remember(sessionId);
          set((s) =>
            updateAssistantMessage(s, sessionId, assistantIdRef.current, {
              status: "error",
              error,
            }),
          );
          return true;
        }

        if (
          res.status === 202 &&
          res.headers.get("content-type")?.includes("application/json")
        ) {
          const receipt = await res.json();
          if (
            !requestId ||
            receipt.requestId !== requestId ||
            receipt.sessionId !== sessionId ||
            !/^[a-f0-9]{24}$/.test(receipt.userMessageId) ||
            !/^[a-f0-9]{24}$/.test(receipt.messageId)
          ) {
            throw new Error("Invalid turn receipt");
          }
          // The existing run owns this request; recover from its persisted status.
          return true;
        }

        if (!res.body) throw new Error("Missing stream");
        await consumeStream(
          set,
          get,
          sessionId,
          assistantIdRef,
          res.body,
          editOfMessageId ?? tempUserId,
        );
        return false;
      };

      let handled: boolean;
      try {
        handled = await deliver();
      } catch (err) {
        if (
          !requestId ||
          ac.signal.aborted ||
          assistantIdRef.current !== tempAssistantId
        )
          throw err;
        handled = false;
      }

      if (
        !handled &&
        requestId &&
        !ac.signal.aborted &&
        assistantIdRef.current === tempAssistantId
      ) {
        // One retry before message.start. Both POSTs carry the exact same body.
        handled = await deliver();
      }
      if (pending && ticket(sessionId) && !ac.signal.aborted) {
        const last = get().bySession[sessionId]?.messages.find(
          (m) => m.id === assistantIdRef.current,
        );
        if (!handled && last && last.status !== "streaming") {
          remember(sessionId);
          if (last.status === "done")
            useSessionsStore.getState().pollTitle(sessionId);
        } else await recover(set, get, sessionId, pending, ac);
        return;
      }
      if (handled) return;

      const current = get().bySession[sessionId]?.messages.find(
        (m) => m.id === assistantIdRef.current,
      );
      if (current?.status === "streaming") {
        set((s) =>
          updateAssistantMessage(s, sessionId, assistantIdRef.current, {
            status: "error",
            error: current.error ?? {
              code: "DISCONNECTED",
              message: "Koneksi terputus",
            },
          }),
        );
      } else if (current?.status === "done") {
        useSessionsStore.getState().pollTitle(sessionId);
      }
    } catch (err: unknown) {
      if (pending && !ac.signal.aborted) {
        await recover(set, get, sessionId, pending, ac);
        return;
      }
      if (err instanceof Error && err.name === "AbortError") {
        set((s) =>
          updateAssistantMessage(s, sessionId, assistantIdRef.current, {
            status: "aborted",
            error: undefined,
          }),
        );
      } else {
        set((s) => {
          const current = s.bySession[sessionId]?.messages.find(
            (m) => m.id === assistantIdRef.current,
          );
          if (current?.status !== "streaming") return s;
          return updateAssistantMessage(s, sessionId, current.id, {
            status: "error",
            error: current.error ?? {
              code: "NETWORK_ERROR",
              message: "Connection lost. Please try again.",
            },
          });
        });
      }
    } finally {
      if (get().controllers[sessionId] === ac) {
        finalizeStream(set, sessionId);
        useSessionsStore.getState().bump(sessionId);
      }
    }
  },

  regenerate: async (sessionId, messageId) => {
    if (get().controllers[sessionId] || messageId.startsWith("tmp-")) return;
    const previous = get().bySession[sessionId]?.messages.at(-1);
    if (!previous || previous.id !== messageId || previous.role !== "assistant")
      return;

    const ac = new AbortController();
    const tempAssistantId = `tmp-a-${Date.now()}`;
    const assistantIdRef = { current: tempAssistantId };

    set((s) => {
      const existing = s.bySession[sessionId];
      const messages = [...(existing?.messages ?? [])];

      const idx = messages.findIndex((m) => m.id === messageId);
      if (idx >= 0) {
        messages.splice(idx);
      }

      messages.push({
        id: tempAssistantId,
        role: "assistant",
        blocks: [],
        status: "streaming",
        createdAt: new Date().toISOString(),
      });

      return {
        controllers: { ...s.controllers, [sessionId]: ac },
        bySession: {
          ...s.bySession,
          [sessionId]: {
            ...(existing ?? {
              messages: [],
              nextCursor: null,
              loaded: true,
              loading: false,
            }),
            streaming: true,
            phase: null,
            pendingClarification: null,
            messages,
          },
        },
      };
    });

    try {
      const res = await fetchApiResponse(
        `/sessions/${sessionId}/messages/${messageId}/regenerate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          body: JSON.stringify({}),
          signal: ac.signal,
        },
      );

      if (!res.ok) {
        const error = await readChatHttpError(res);
        set((s) =>
          updateAssistantMessage(s, sessionId, tempAssistantId, {
            ...previous,
            status: "error",
            error,
          }),
        );
        return;
      }

      await consumeStream(set, get, sessionId, assistantIdRef, res.body!);

      const current = get().bySession[sessionId]?.messages.find(
        (m) => m.id === assistantIdRef.current,
      );
      if (current?.status === "streaming") {
        set((s) =>
          updateAssistantMessage(s, sessionId, assistantIdRef.current, {
            status: "error",
            error: { code: "DISCONNECTED", message: "Koneksi terputus" },
          }),
        );
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        set((s) =>
          updateAssistantMessage(s, sessionId, assistantIdRef.current, {
            status: "aborted",
            error: undefined,
          }),
        );
      } else {
        set((s) => {
          const current = s.bySession[sessionId]?.messages.find(
            (m) => m.id === assistantIdRef.current,
          );
          if (current?.status !== "streaming") return s;
          return updateAssistantMessage(s, sessionId, current.id, {
            status: "error",
            error: current.error ?? {
              code: "NETWORK_ERROR",
              message: "Koneksi terputus. Silakan coba kembali.",
            },
          });
        });
      }
    } finally {
      if (get().controllers[sessionId] === ac) {
        if (assistantIdRef.current === tempAssistantId) {
          set((s) => {
            const draft = s.bySession[sessionId]?.messages.find(
              (m) => m.id === tempAssistantId,
            );
            if (!draft) return s;
            return updateAssistantMessage(s, sessionId, tempAssistantId, {
              blocks: previous.blocks,
              sources: previous.sources,
              truncated: previous.truncated,
            });
          });
        }
        finalizeStream(set, sessionId);
        useSessionsStore.getState().bump(sessionId);
      }
    }
  },

  stop: (id) => {
    const pending = ticket(id);
    if (!pending) {
      get().controllers[id]?.abort();
      return;
    }
    void fetchApi(`/sessions/${id}/turns/${pending.request}/stop`, {
      method: "POST",
    }).catch(() =>
      useToastStore
        .getState()
        .push("error", "Permintaan berhenti belum diterima. Coba lagi."),
    );
  },

  respond: async (sessionId, questionId, answer) => {
    await fetchApi(`/sessions/${sessionId}/respond`, {
      method: "POST",
      body: JSON.stringify({ questionId, answer }),
    });
  },

  startEdit: (sessionId, messageId, text) => {
    set((s) => ({
      editingBySession: {
        ...s.editingBySession,
        [sessionId]: { messageId, text },
      },
    }));
    const turn = decodeUserTurn(text);
    const composer = useComposerStore.getState();

    composer.setText(sessionId, turn.text);
    composer.setMessageContext(sessionId, turn.pastes, turn.reply);
  },

  cancelEdit: (sessionId) => {
    set((s) => {
      const next = { ...s.editingBySession };
      delete next[sessionId];
      return { editingBySession: next };
    });
    const composer = useComposerStore.getState();
    composer.setText(sessionId, "");
    composer.setMessageContext(sessionId, []);
  },

  reset: () => {
    const state = get();
    Object.values(state.controllers).forEach((ac) => {
      try {
        ac.abort();
      } catch {
        // ignore
      }
    });
    stopAllJobPollers();
    set({ bySession: {}, controllers: {}, editingBySession: {} });
  },
}));

// ── Helpers ────────────────────────────────────────────────────────

function finalizeStream(set: SetChatState, sessionId: string): void {
  set((s) => {
    const nextControllers = { ...s.controllers };
    delete nextControllers[sessionId];
    const existing = s.bySession[sessionId];
    if (!existing) return { controllers: nextControllers };
    return {
      controllers: nextControllers,
      bySession: {
        ...s.bySession,
        [sessionId]: {
          ...existing,
          streaming: false,
          phase: null,
          pendingClarification: null,
        },
      },
    };
  });
}

interface PendingDelta {
  sessionId: string;
  assistantId: string;
  blockIndex: number;
  delta: string;
}

function applyDeltaBatch(
  set: SetChatState,
  batch: PendingDelta[],
): void {
  if (batch.length === 0) return;
  set((s) => {
    const byMessage = new Map<string, Map<number, string>>();
    for (const item of batch) {
      const mKey = `${item.sessionId}\u0000${item.assistantId}`;
      let byBlock = byMessage.get(mKey);
      if (!byBlock) {
        byBlock = new Map();
        byMessage.set(mKey, byBlock);
      }
      byBlock.set(
        item.blockIndex,
        (byBlock.get(item.blockIndex) ?? "") + item.delta,
      );
    }
    let next: ChatState = s;
    for (const [mKey, byBlock] of byMessage) {
      const sep = mKey.indexOf("\u0000");
      const sid = mKey.slice(0, sep);
      const aid = mKey.slice(sep + 1);
      const session = next.bySession[sid];
      if (!session) continue;
      let touched = false;
      const messages = session.messages.map((m) => {
        if (m.id !== aid) return m;
        if (m.status !== "streaming") return m;
        const blocks = [...(m.blocks || [])];
        let changed = false;
        for (const [idx, d] of byBlock) {
          const prev = blocks[idx];
          if (!prev) continue;
          if (prev.type === "text") {
            blocks[idx] = { ...prev, markdown: prev.markdown + d };
            changed = true;
          } else if (prev.type === "code") {
            blocks[idx] = { ...prev, content: prev.content + d };
            changed = true;
          }
        }
        if (!changed) return m;
        touched = true;
        return { ...m, blocks };
      });
      if (!touched) continue;
      next = {
        ...next,
        bySession: {
          ...next.bySession,
          [sid]: { ...session, messages },
        },
      };
    }
    return next;
  });
}

async function consumeStream(
  set: SetChatState,
  get: () => ChatState,
  sessionId: string,
  assistantIdRef: { current: string },
  body: ReadableStream<Uint8Array>,
  localUserId?: string,
): Promise<void> {
  let autoOpened = false;
  let sawFirstDelta = false;

  const pending = new Map<string, PendingDelta>();
  let rafId: number | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let scheduled = false;
  let cancelled = false;

  function doFlush(): void {
    if (rafId !== null) {
      if (typeof cancelAnimationFrame === "function")
        cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    scheduled = false;
    if (pending.size === 0) return;
    const batch = [...pending.values()];
    pending.clear();
    applyDeltaBatch(set, batch);
  }

  function schedule(): void {
    if (scheduled) return;
    scheduled = true;
    const isVisible =
      typeof document === "undefined" ||
      document.visibilityState === "visible";
    if (isVisible && typeof requestAnimationFrame === "function") {
      rafId = requestAnimationFrame(() => {
        rafId = null;
        doFlush();
      });
    } else {
      // Hidden tab: rAF tidak akan menembak; pakai setTimeout agar
      // pesan tetap selesai tanpa menunggu frame.
      timeoutId = setTimeout(() => {
        timeoutId = null;
        doFlush();
      }, 16);
    }
  }

  function pushDelta(
    sid: string,
    aid: string,
    blockIndex: number,
    delta: string,
  ): void {
    if (cancelled) return;
    const key = `${sid}\u0000${aid}\u0000${blockIndex}`;
    const existing = pending.get(key);
    if (existing) {
      existing.delta += delta;
    } else {
      pending.set(key, {
        sessionId: sid,
        assistantId: aid,
        blockIndex,
        delta,
      });
    }
    schedule();
  }

  const stream = parseSse(body);
  try {
    for await (const chunk of stream) {
      if (chunk.event === "message") continue;
      let data: unknown;
      try {
        data = JSON.parse(chunk.data);
      } catch {
        continue;
      }

      if (chunk.event === "message.start") {
        doFlush();
        const { messageId, userMessageId } = data as {
          messageId: string;
          userMessageId?: string;
        };

        if (
          localUserId &&
          typeof userMessageId === "string" &&
          localUserId !== userMessageId
        ) {
          set((s) => renameMessage(s, sessionId, localUserId, userMessageId));
        }

        set((s) =>
          renameMessage(s, sessionId, assistantIdRef.current, messageId),
        );
        assistantIdRef.current = messageId;
        continue;
      }

      if (chunk.event === "block.delta") {
        const payload = data as { index?: unknown; delta?: unknown };
        const idx = payload.index;
        const d = payload.delta;
        if (typeof idx === "number" && typeof d === "string" && d.length > 0) {
          if (!sawFirstDelta) {
            sawFirstDelta = true;
            applyDeltaBatch(set, [
              {
                sessionId,
                assistantId: assistantIdRef.current,
                blockIndex: idx,
                delta: d,
              },
            ]);
          } else {
            pushDelta(sessionId, assistantIdRef.current, idx, d);
          }
          continue;
        }
      }

      // Event struktural (thinking, block.start/end, tool, error,
      // message.end, done, dsb.): flush batch tertunda dulu agar urutan
      // dan semantik terjaga.
      doFlush();

      handleEvent(
        set,
        get,
        sessionId,
        assistantIdRef.current,
        chunk.event,
        data,
      );

      if (autoOpened || chunk.event !== "tool.end") continue;

      const activeChat = matchPath("/chat/:id", window.location.pathname);
      if (activeChat?.params.id !== sessionId) continue;

      const { callId } = data as { callId: string };
      const message = get().bySession[sessionId]?.messages.find(
        (item) => item.id === assistantIdRef.current,
      );

      const tool = message?.tools?.find((item) => item.callId === callId);
      if (!message || tool?.status !== "ok") continue;
      if (tool.name !== "present_files" && tool.name !== "create_file")
        continue;

      const file = message.blocks
        .slice(tool.beforeIndex)
        .find((block) => block?.type === "file" && block.preview !== "none");

      if (file?.type !== "file") continue;

      autoOpened = true;
      useUIStore.getState().openPreview(file);
    }
  } finally {
    doFlush();
    cancelled = true;
    pending.clear();
    if (rafId !== null) {
      if (typeof cancelAnimationFrame === "function")
        cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    scheduled = false;
  }
}

function updateAssistantMessage(
  state: ChatState,
  sessionId: string,
  msgId: string,
  updates: Partial<ChatMessage>,
): Partial<ChatState> {
  const session = state.bySession[sessionId];
  if (!session) return {};
  return {
    bySession: {
      ...state.bySession,
      [sessionId]: {
        ...session,
        messages: session.messages.map((m) =>
          m.id === msgId ? { ...m, ...updates } : m,
        ),
      },
    },
  };
}

function renameMessage(
  state: ChatState,
  sessionId: string,
  oldId: string,
  newId: string,
): Partial<ChatState> {
  const session = state.bySession[sessionId];
  if (!session) return {};
  return {
    bySession: {
      ...state.bySession,
      [sessionId]: {
        ...session,
        messages: session.messages.map((m) =>
          m.id === oldId ? { ...m, id: newId } : m,
        ),
      },
    },
  };
}

function handleEvent(
  set: SetChatState,
  get: () => ChatState,
  sessionId: string,
  assistantId: string,
  event: string,
  data: unknown,
): void {
  const session = get().bySession[sessionId];
  if (!session) return;

  const payload = data as Record<string, any>;

  // ── Session-level events ──────────────────────────────────────
  switch (event) {
    case "status":
      set((s) => ({
        bySession: {
          ...s.bySession,
          [sessionId]: {
            ...s.bySession[sessionId],
            phase: payload.phase as StreamPhase,
          },
        },
      }));
      return;
    case "clarification.needed":
      set((s) => ({
        bySession: {
          ...s.bySession,
          [sessionId]: {
            ...s.bySession[sessionId],
            pendingClarification: {
              questionId: payload.questionId as string,
              question: payload.question as string,
              multi: payload.multi as boolean,
              options: payload.options as {
                label: string;
                value?: string;
              }[],
              timeoutMs: payload.timeoutMs as number,
              receivedAt: Date.now(),
            },
          },
        },
      }));
      return;
    case "clarification.resolved":
      set((s) => ({
        bySession: {
          ...s.bySession,
          [sessionId]: {
            ...s.bySession[sessionId],
            pendingClarification: null,
          },
        },
      }));
      return;
    case "title":
      useSessionsStore.getState().setTitle(sessionId, payload.title);
      return;
  }

  // ── Message-level events ─────────────────────────────────────
  const msg = session.messages.find((m) => m.id === assistantId);
  if (!msg) return;

  let updates: Partial<ChatMessage> | null = null;

  switch (event) {
    case "sources":
      updates = { sources: payload.sources as any };
      break;
    case "thinking.delta": {
      if (msg.thinking || !payload.delta) return;

      updates = { thinking: { done: false } };
      break;
    }

    case "thinking.end": {
      updates = {
        thinking: {
          done: true,
          durationMs: payload.durationMs as number,
        },
      };
      break;
    }
    case "block.start":
    case "block.end": {
      const blocks = [...(msg.blocks || [])];
      blocks[payload.index as number] = payload.block;
      updates = { blocks };
      break;
    }
    case "block.delta": {
      const blocks = [...(msg.blocks || [])];
      const prev = blocks[payload.index as number];
      if (prev && prev.type === "text") {
        blocks[payload.index as number] = {
          ...prev,
          markdown: prev.markdown + (payload.delta as string),
        };
      } else if (prev && prev.type === "code") {
        blocks[payload.index as number] = {
          ...prev,
          content: prev.content + (payload.delta as string),
        };
      }
      updates = { blocks };
      break;
    }
    case "tool.start":
      updates = {
        tools: [
          ...(msg.tools || []),
          {
            callId: payload.callId,
            name: payload.name,
            status: "running",
            beforeIndex: msg.blocks.length,
          },
        ],
      };
      break;
    case "tool.end":
      updates = {
        tools: (msg.tools || []).map((t) =>
          t.callId === payload.callId
            ? {
                ...t,
                status: payload.ok ? "ok" : "error",
                summary: payload.summary,
              }
            : t,
        ),
      };
      break;
    case "media.progress": {
      const mp = payload as MediaProgress;
      updates = {
        mediaProgress: {
          jobId: mp.jobId,
          engine: mp.engine,
          kind: mp.kind,
          status: mp.status,
          ...(mp.message !== undefined ? { message: mp.message } : {}),
        },
      };
      // Start reconciliation only when SSE actually provided a jobId.
      ensureJobPolling(set, get, sessionId, assistantId, mp);
      break;
    }
    case "error":
      updates = {
        error: { code: payload.code, message: payload.message },
      };
      break;
    case "message.end": {
      set((s) => {
        const cur = s.bySession[sessionId];
        if (!cur) return s;
        return {
          bySession: {
            ...s.bySession,
            [sessionId]: {
              ...cur,
              phase: null,
              pendingClarification: null,
              messages: cur.messages.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      status: payload.status,
                      usage: payload.usage,
                      ...(payload.truncated === true
                        ? { truncated: true }
                        : {}),
                      ...(payload.status === "done" ||
                      payload.status === "aborted"
                        ? { error: undefined }
                        : {}),
                    }
                  : m,
              ),
            },
          },
        };
      });
      return;
    }
    default:
      return;
  }

  if (updates) {
    set((s) => updateAssistantMessage(s, sessionId, assistantId, updates));
  }
}
