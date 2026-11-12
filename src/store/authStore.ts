import { create } from "zustand";
import { api, ApiError } from "../lib/api";
import type { User } from "../types";

interface AuthState {
  user: User | null;
  status: "loading" | "authed" | "anon" | "offline";
  bootstrap: () => Promise<void>;
  login: (body: any) => Promise<void>;
  register: (body: any) => Promise<void>;
  logout: () => Promise<void>;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: "loading",
  bootstrap: async () => {
    try {
      const user = await api.auth.me();
      set({ user, status: "authed" });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        set({ user: null, status: "anon" });
      } else {
        set({ user: null, status: "offline" });
      }
    }
  },
  login: async (body) => {
    const user = await api.auth.login(body);
    set({ user, status: "authed" });
  },
  register: async (body) => {
    const user = await api.auth.register(body);
    set({ user, status: "authed" });
  },
  logout: async () => {
    try {
      await api.auth.logout();
    } catch {}
    set({ user: null, status: "anon" });
  },
  clear: () => set({ user: null, status: "anon" }),
}));
