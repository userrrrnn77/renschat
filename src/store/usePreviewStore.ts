import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { FileBlock } from "../types";

interface PreviewState {
  activeFile: FileBlock | null;
  expanded: boolean;
  setActiveFile: (file: FileBlock | null) => void;
  clearActiveFile: () => void;
  setExpanded: (expanded: boolean) => void;
}

export const usePreviewStore = create<PreviewState>()(
  persist(
    (set) => ({
      activeFile: null,
      expanded: false,
      setActiveFile: (file) =>
        set((s) => ({
          activeFile: file,
          expanded:
            file && s.activeFile && s.activeFile.fileId === file.fileId
              ? s.expanded
              : false,
        })),
      clearActiveFile: () => set({ activeFile: null, expanded: false }),
      setExpanded: (expanded) => set({ expanded }),
    }),
    {
      name: "renschat-preview-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        activeFile: state.activeFile
          ? { ...state.activeFile, localFile: undefined }
          : null,
      }),
    },
  ),
);
