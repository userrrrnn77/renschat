import { create } from "zustand";
import { fetchApi } from "../lib/api";
import { parseSse } from "../lib/sse";
import type { ChatMessage, StreamEvent, ServerMessage } from "../types";
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
    }
  >;
  controllers: Record<string, AbortController>;
  open: (id: string) => Promise<void>;
  loadOlder: (id: string) => Promise<void>;
  send: (id: string, text: string, attachments: any[]) => Promise<void>;
  stop: (id: string) => void;
  reset: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  bySession: {},
  controllers: {},

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
        },
      },
    }));

    try {
      const data = await fetchApi<any>(`/sessions/${id}?limit=50`);
      const mappedMessages: ChatMessage[] = data.messages.map(
        (m: ServerMessage) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          blocks: m.blocks,
          status: m.status,
          createdAt: m.createdAt,
          // attachments mapping if needed
        }),
      );

      set((s) => ({
        bySession: {
          ...s.bySession,
          [id]: {
            messages: mappedMessages,
            nextCursor: data.nextCursor,
            loaded: true,
            loading: false,
            streaming: false,
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
      const data = await fetchApi<any>(
        `/sessions/${id}?limit=50&cursor=${session.nextCursor}`,
      );
      const mappedMessages: ChatMessage[] = data.messages.map(
        (m: ServerMessage) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          blocks: m.blocks,
          status: m.status,
          createdAt: m.createdAt,
        }),
      );

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

  send: async (sessionId, text, attachments) => {
    const ac = new AbortController();
    const tempUserId = `tmp-u-${Date.now()}`;
    const tempAssistantId = `tmp-a-${Date.now()}`;

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
        handleEvent(set, get, sessionId, tempAssistantId, chunk.event, data);
      }

      // If stream ends but status still streaming (no message.end), mark as error
      const current = get().bySession[sessionId]?.messages.find(
        (m) => m.id === tempAssistantId,
      );
      if (current?.status === "streaming") {
        set((s) =>
          updateAssistantMessage(s, sessionId, tempAssistantId, {
            status: "error",
            error: { code: "DISCONNECTED", message: "Koneksi terputus" },
          }),
        );
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        set((s) =>
          updateAssistantMessage(s, sessionId, tempAssistantId, {
            status: "aborted",
          }),
        );
      } else {
        set((s) =>
          updateAssistantMessage(s, sessionId, tempAssistantId, {
            status: "error",
            error: { code: "ERROR", message: "Gagal mengirim pesan" },
          }),
        );
      }
    } finally {
      set((s) => ({
        controllers: { ...s.controllers, [sessionId]: undefined as any },
        bySession: {
          ...s.bySession,
          [sessionId]: { ...s.bySession[sessionId], streaming: false },
        },
      }));
      useSessionsStore.getState().bump(sessionId);
    }
  },

  stop: (id) => {
    get().controllers[id]?.abort();
  },

  reset: () => set({ bySession: {}, controllers: {} }),
}));

function updateAssistantMessage(
  state: any,
  sessionId: string,
  msgId: string,
  updates: any,
) {
  const session = state.bySession[sessionId];
  if (!session) return state;
  return {
    bySession: {
      ...state.bySession,
      [sessionId]: {
        ...session,
        messages: session.messages.map((m: any) =>
          m.id === msgId ? { ...m, ...updates } : m,
        ),
      },
    },
  };
}

function handleEvent(
  set: any,
  get: any,
  sessionId: string,
  tempAssistantId: string,
  event: string,
  data: any,
) {
  if (event === "message.start") {
    set((s: any) => {
      const session = s.bySession[sessionId];
      return {
        bySession: {
          ...s.bySession,
          [sessionId]: {
            ...session,
            messages: session.messages.map((m: any) =>
              m.id === tempAssistantId ? { ...m, id: data.messageId } : m,
            ),
          },
        },
      };
    });
    return;
  }

  const currentId = get().bySession[sessionId]?.messages.find(
    (m: any) => m.role === "assistant" && m.status === "streaming",
  )?.id;
  if (!currentId) return;

  const session = get().bySession[sessionId];
  const msg = session.messages.find((m: any) => m.id === currentId);
  if (!msg) return;

  let updates: any = {};

  switch (event) {
    case "block.start":
      updates.blocks = [...(msg.blocks || [])];
      updates.blocks[data.index] = data.block;
      break;
    case "block.delta": {
      updates.blocks = [...(msg.blocks || [])];
      const blk = { ...updates.blocks[data.index] };
      if (blk.type === "text") blk.markdown += data.delta;
      if (blk.type === "code") blk.content += data.delta;
      updates.blocks[data.index] = blk;
      break;
    }
    case "block.end":
      updates.blocks = [...(msg.blocks || [])];
      updates.blocks[data.index] = data.block;
      break;
    case "tool.start":
      updates.tools = [
        ...(msg.tools || []),
        {
          callId: data.callId,
          name: data.name,
          status: "running",
          beforeIndex: msg.blocks.length,
        },
      ];
      break;
    case "tool.end":
      updates.tools = (msg.tools || []).map((t: any) =>
        t.callId === data.callId
          ? { ...t, status: data.ok ? "ok" : "error", summary: data.summary }
          : t,
      );
      break;
    case "title":
      useSessionsStore.getState().setTitle(sessionId, data.title);
      break;
    case "error":
      updates.error = { code: data.code, message: data.message };
      break;
    case "message.end":
      updates.status = data.status;
      updates.usage = data.usage;
      break;
  }

  set((s: any) => updateAssistantMessage(s, sessionId, currentId, updates));
}
