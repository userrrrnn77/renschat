// src/store/authStore.ts
import { create } from "zustand";
import { api, ApiError } from "../lib/api";
import type { User } from "../types";
import { useChatStore } from "./chatStore";
import { useComposerStore } from "./composerStore";

interface AuthState {
  user: User | null;
  status: "loading" | "authed" | "anon" | "offline";
  bootstrap: () => Promise<void>;
  login: (body: any) => Promise<void>;
  register: (body: any) => Promise<void>;
  logout: () => Promise<void>;
  clear: () => void;
}

function resetClientStores(): void {
  useChatStore.getState().reset();
  useComposerStore.getState().reset();
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
    } catch {
      // ignore
    }
    resetClientStores();
    set({ user: null, status: "anon" });
  },
  clear: () => {
    resetClientStores();
    set({ user: null, status: "anon" });
  },
}));
