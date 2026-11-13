// src/store/sessionsStore.ts
import { create } from "zustand";
import { api } from "../lib/api";
import type { SessionItem } from "../types";
import { groupByDate } from "../lib/time";
import { useChatStore } from "./chatStore";
import { useComposerStore } from "./composerStore";
import { useToastStore } from "./toastStore";

interface SessionsState {
  items: SessionItem[];
  nextCursor: string | null;
  loading: boolean;
  query: string;
  loadFirst: () => Promise<void>;
  loadMore: () => Promise<void>;
  upsert: (item: SessionItem) => void;
  patch: (id: string, partial: Partial<SessionItem>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  bump: (id: string) => void;
  setTitle: (id: string, title: string) => void;
  setQuery: (q: string) => void;
  pollTitle: (id: string) => void;
}

export const useSessionsStore = create<SessionsState>((set, get) => ({
  items: [],
  nextCursor: null,
  loading: false,
  query: "",

  loadFirst: async () => {
    set({ loading: true });
    try {
      const data = await api.sessions.list("?limit=30");
      set({ items: data.items, nextCursor: data.nextCursor, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  loadMore: async () => {
    const { nextCursor, loading } = get();
    if (!nextCursor || loading) return;
    set({ loading: true });
    try {
      const data = await api.sessions.list(`?limit=30&cursor=${nextCursor}`);
      set((s) => ({
        items: [...s.items, ...data.items],
        nextCursor: data.nextCursor,
        loading: false,
      }));
    } catch {
      set({ loading: false });
    }
  },

  upsert: (item) =>
    set((s) => {
      const idx = s.items.findIndex((x) => x.id === item.id);
      if (idx >= 0) {
        const next = [...s.items];
        next[idx] = item;
        return { items: next };
      }
      return { items: [item, ...s.items] };
    }),

  /**
   * Optimistic patch. Hit backend supaya `titleAuto` flip ke `false` saat
   * user rename manual — tanpa ini, `pollTitle` akan overwrite balik
   * judul manual dengan judul auto-generate di giliran berikutnya.
   */
  patch: async (id, partial) => {
    set((s) => ({
      items: s.items.map((x) => (x.id === id ? { ...x, ...partial } : x)),
    }));
    try {
      const updated = await api.sessions.patch(id, partial);
      set((s) => ({
        items: s.items.map((x) => (x.id === id ? { ...x, ...updated } : x)),
      }));
    } catch {
      // Optimistic state remains; reload akan reconcile.
    }
  },

  /**
   * Hapus sesi. Optimistic: hilangkan dari sidebar dulu, hit backend,
   * evict state terkait (chat + draft). Bila backend gagal, restore list
   * dan tampilkan toast. Abort stream yang sedang berjalan untuk sesi ini
   * agar `send`'s finally tidak race dengan eviction.
   */
  remove: async (id) => {
    const prevItems = get().items;
    const item = prevItems.find((x) => x.id === id);
    if (!item) return;

    // Abort any active stream untuk sesi ini sebelum eviction.
    const ctrl = useChatStore.getState().controllers[id];
    if (ctrl) {
      try {
        ctrl.abort();
      } catch {
        // ignore
      }
    }

    set({ items: prevItems.filter((x) => x.id !== id) });

    try {
      await api.sessions.delete(id);

      // Evict state agar memori tidak menahan data sesi yang sudah dihapus.
      useChatStore.setState((s) => {
        if (!(id in s.bySession)) return s;
        const next = { ...s.bySession };
        delete next[id];
        return { bySession: next };
      });
      useComposerStore.setState((s) => {
        if (!(id in s.drafts)) return s;
        const draft = s.drafts[id];
        draft?.attachments.forEach((a) => {
          if (a.localUrl) URL.revokeObjectURL(a.localUrl);
        });
        const next = { ...s.drafts };
        delete next[id];
        return { drafts: next };
      });
    } catch {
      set({ items: prevItems });
      useToastStore
        .getState()
        .push("error", "Gagal menghapus chat. Coba lagi.");
    }
  },

  bump: (id) =>
    set((s) => {
      const item = s.items.find((x) => x.id === id);
      if (!item) return s;
      const rest = s.items.filter((x) => x.id !== id);
      return {
        items: [{ ...item, lastMessageAt: new Date().toISOString() }, ...rest],
      };
    }),

  setTitle: (id, title) =>
    set((s) => ({
      items: s.items.map((x) =>
        x.id === id ? { ...x, title, titleAuto: false } : x,
      ),
    })),

  setQuery: (query) => set({ query }),

  /**
   * Poll GET /api/sessions/:id?limit=1 sampai `titleAuto === false`
   * (title gen selesai) atau timeout 30s. Non-blocking.
   */
  pollTitle: (id) => {
    const current = get().items.find((x) => x.id === id);
    if (!current) return;
    if (current.titleAuto === false) return;

    const startedAt = Date.now();
    const MAX_MS = 30_000;
    const INTERVAL_MS = 3_000;

    const tick = async (): Promise<void> => {
      if (Date.now() - startedAt > MAX_MS) return;
      try {
        const data = await api.sessions.get(id, "?limit=1");
        const s: { title: string; titleAuto: boolean } | undefined =
          data?.session;
        if (!s) return;
        if (s.titleAuto === false) {
          set((st) => ({
            items: st.items.map((x) =>
              x.id === id ? { ...x, title: s.title, titleAuto: false } : x,
            ),
          }));
          return;
        }
        setTimeout(() => void tick(), INTERVAL_MS);
      } catch {
        setTimeout(() => void tick(), INTERVAL_MS);
      }
    };

    setTimeout(() => void tick(), 1_500);
  },
}));

export const selectGroupedSessions = () => {
  const { items, query } = useSessionsStore();
  const filtered = items.filter((x) =>
    x.title.toLowerCase().includes(query.toLowerCase()),
  );

  const pinned = filtered.filter((x) => x.pinned);
  const unpinned = filtered.filter((x) => !x.pinned);

  const groups: Record<string, SessionItem[]> = {};
  const groupOrder = ["Hari Ini", "Kemarin", "7 Hari Terakhir", "Lebih Lama"];

  unpinned.forEach((item) => {
    const group = groupByDate(item.lastMessageAt);
    if (!groups[group]) groups[group] = [];
    groups[group].push(item);
  });

  const result = [];
  if (pinned.length > 0) result.push({ title: "Disematkan", items: pinned });
  groupOrder.forEach((g) => {
    if (groups[g]?.length > 0) result.push({ title: g, items: groups[g] });
  });

  return result;
};
