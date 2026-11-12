import { create } from "zustand";
import { api } from "../lib/api";
import type { SessionItem } from "../types";
import { groupByDate } from "../lib/time";

interface SessionsState {
  items: SessionItem[];
  nextCursor: string | null;
  loading: boolean;
  query: string;
  loadFirst: () => Promise<void>;
  loadMore: () => Promise<void>;
  upsert: (item: SessionItem) => void;
  patch: (id: string, partial: Partial<SessionItem>) => void;
  remove: (id: string) => void;
  bump: (id: string) => void;
  setTitle: (id: string, title: string) => void;
  setQuery: (q: string) => void;
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

  patch: (id, partial) =>
    set((s) => ({
      items: s.items.map((x) => (x.id === id ? { ...x, ...partial } : x)),
    })),

  remove: (id) =>
    set((s) => ({
      items: s.items.filter((x) => x.id !== id),
    })),

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
      items: s.items.map((x) => (x.id === id ? { ...x, title } : x)),
    })),

  setQuery: (query) => set({ query }),
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
