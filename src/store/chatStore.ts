// src/store/chatStore.ts
import { create } from "zustand";
import { fetchApi } from "../lib/api";
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

interface ChatState {
  bySession: Record<
    string,
    {
      messages: ChatMessage[];
      nextCursor: string | null;
      loaded: boolean;
      loading: boolean;
      streaming: boolean;
      phase: StreamPhase;
      pendingClarification: PendingClarification | null;
    }
  >;
  controllers: Record<string, AbortController>;
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
  ) => Promise<void>;
  stop: (id: string) => void;
  respond: (
    sessionId: string,
    questionId: string,
    answer: string[],
  ) => Promise<void>;
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
    createdAt: m.createdAt,
    ...(m.sources !== undefined ? { sources: m.sources } : {}),
  };
}

export const useChatStore = create<ChatState>((set, get) => ({
  bySession: {},
  controllers: {},

  // REPLACE: open
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
    if (!session || !session.nextCursor || session.loading) return;

    set((s) => ({
      bySession: { ...s.bySession, [id]: { ...session, loading: true } },
    }));

    try {
      const data = await fetchApi<{
        messages: ServerMessage[];
        nextCursor: string | null;
      }>(`/sessions/${id}?limit=50&cursor=${session.nextCursor}`);
      const mappedMessages: ChatMessage[] = data.messages.map(mapServerMessage);

      set((s) => ({
        bySession: {
          ...s.bySession,
          [id]: {
            ...s.bySession[id],
            messages: [...mappedMessages, ...s.bySession[id].messages],
            nextCursor: data.nextCursor,
            loading: false,
          },
        },
      }));
    } catch {
      set((s) => ({
        bySession: { ...s.bySession, [id]: { ...session, loading: false } },
      }));
    }
  },

  send: async (sessionId, text, attachments, generation) => {
    const ac = new AbortController();
    const tempUserId = `tmp-u-${Date.now()}`;
    const tempAssistantId = `tmp-a-${Date.now()}`;
    let currentAssistantId = tempAssistantId;

    set((s) => ({
      controllers: { ...s.controllers, [sessionId]: ac },
      bySession: {
        ...s.bySession,
        [sessionId]: {
          ...(s.bySession[sessionId] || {
            messages: [],
            nextCursor: null,
            loaded: true,
            loading: false,
          }),
          streaming: true,
          phase: null,
          pendingClarification: null,
          messages: [
            ...(s.bySession[sessionId]?.messages || []),
            {
              id: tempUserId,
              role: "user",
              blocks: [{ type: "text", markdown: text }],
              status: "done",
              createdAt: new Date().toISOString(),
              attachments,
            },
            {
              id: tempAssistantId,
              role: "assistant",
              blocks: [],
              status: "streaming",
              createdAt: new Date().toISOString(),
            },
          ],
        },
      },
    }));

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || ""}/api/sessions/${sessionId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          body: JSON.stringify({
            text,
            attachmentIds: attachments.map((a) => a.id),
            ...(generation !== undefined ? { generation } : {}),
          }),
          credentials: "include",
          signal: ac.signal,
        },
      );

      if (!res.ok) throw new Error("HTTP error");

      const stream = parseSse(res.body!);
      for await (const chunk of stream) {
        if (chunk.event === "message") continue;
        const data = JSON.parse(chunk.data);

        if (chunk.event === "message.start") {
          const realId = data.messageId as string;
          set((s) => renameMessage(s, sessionId, tempAssistantId, realId));
          currentAssistantId = realId;
          continue;
        }

        handleEvent(set, get, sessionId, currentAssistantId, chunk.event, data);
      }

      const current = get().bySession[sessionId]?.messages.find(
        (m) => m.id === currentAssistantId,
      );
      if (current?.status === "streaming") {
        set((s) =>
          updateAssistantMessage(s, sessionId, currentAssistantId, {
            status: "error",
            error: { code: "DISCONNECTED", message: "Koneksi terputus" },
          }),
        );
      } else if (current?.status === "done") {
        useSessionsStore.getState().pollTitle(sessionId);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        set((s) =>
          updateAssistantMessage(s, sessionId, currentAssistantId, {
            status: "aborted",
            error: undefined,
          }),
        );
      } else {
        set((s) =>
          updateAssistantMessage(s, sessionId, currentAssistantId, {
            status: "error",
            error: { code: "ERROR", message: "Gagal mengirim pesan" },
          }),
        );
      }
    } finally {
      set((s) => {
        const nextControllers = { ...s.controllers };
        delete nextControllers[sessionId];
        const existing = s.bySession[sessionId];
        if (!existing) {
          return { controllers: nextControllers };
        }
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
      useSessionsStore.getState().bump(sessionId);
    }
  },

  stop: (id) => {
    get().controllers[id]?.abort();
  },

  respond: async (sessionId, questionId, answer) => {
    await fetchApi(`/sessions/${sessionId}/respond`, {
      method: "POST",
      body: JSON.stringify({ questionId, answer }),
    });
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
    set({ bySession: {}, controllers: {} });
  },
}));

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

  // ── Session-level events ──────────────────────────────────────────
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

  // ── Message-level events ─────────────────────────────────────────
  const msg = session.messages.find((m) => m.id === assistantId);
  if (!msg) return;

  let updates: Partial<ChatMessage> | null = null;

  switch (event) {
    case "sources":
      updates = { sources: payload.sources as any };
      break;
    case "thinking.delta": {
      const current = msg.thinking ?? { text: "", done: false };
      updates = {
        thinking: {
          ...current,
          text: current.text + (payload.delta as string),
        },
      };
      break;
    }
    case "thinking.end": {
      const current = msg.thinking ?? { text: "", done: false };
      updates = {
        thinking: {
          ...current,
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
      // §14.2: progres media generate, bukan block. Indikator ditampilkan
      // pada pesan yang sedang streaming.
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
