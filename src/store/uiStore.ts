import { create } from "zustand";
import type { FileBlock } from "../types";
import { usePreviewStore } from "./usePreviewStore";

type Theme = "light" | "dark" | "system";

interface UIState {
  sidebarOpen: boolean;
  theme: Theme;
  preview: FileBlock | null;
  lightbox: string | null;
  personalityOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setTheme: (theme: Theme) => void;
  openPreview: (file: FileBlock) => void;
  closePreview: () => void;
  setLightbox: (url: string | null) => void;
  setPersonalityOpen: (open: boolean) => void;
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => {
  const savedTheme = (localStorage.getItem("theme") as Theme) || "system";
  const savedSidebar = localStorage.getItem("sidebarOpen") !== "false";
  const initialPreview = usePreviewStore.getState().activeFile;

  return {
    sidebarOpen: savedSidebar,
    theme: savedTheme,
    preview: initialPreview,
    lightbox: null,
    setSidebarOpen: (open) => {
      localStorage.setItem("sidebarOpen", String(open));
      set({ sidebarOpen: open });
    },
    toggleSidebar: () =>
      set((s) => {
        localStorage.setItem("sidebarOpen", String(!s.sidebarOpen));
        return { sidebarOpen: !s.sidebarOpen };
      }),
    setTheme: (theme) => {
      localStorage.setItem("theme", theme);
      const isDark =
        theme === "dark" ||
        (theme === "system" &&
          window.matchMedia("(prefers-color-scheme: dark)").matches);
      document.documentElement.dataset.theme = isDark ? "dark" : "light";
      set({ theme });
    },
    openPreview: (file) => {
      usePreviewStore.getState().setActiveFile(file);
      set({ preview: file });
    },
    closePreview: () => {
      usePreviewStore.getState().clearActiveFile();
      set({ preview: null });
    },
    setLightbox: (url) => set({ lightbox: url }),
    personalityOpen: false,
    setPersonalityOpen: (open) => set({ personalityOpen: open }),
    settingsOpen: false,
    setSettingsOpen: (open) => set({ settingsOpen: open }),
  };
});
