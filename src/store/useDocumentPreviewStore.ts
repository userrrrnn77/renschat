import { create } from "zustand";

export type CopiedState = "none" | "full" | "partial";
export type CsvMode = "table" | "source";

export interface FileDocumentState {
  sheetIndex?: number;
  zoom?: number;
  selection?: string;
  csvMode?: CsvMode;
  copied?: CopiedState;
}

interface DocumentPreviewStore {
  byFile: Record<string, FileDocumentState>;
  setSheetIndex: (fileId: string, sheetIndex: number) => void;
  setZoom: (fileId: string, zoom: number) => void;
  setSelection: (fileId: string, selection: string) => void;
  setCsvMode: (fileId: string, csvMode: CsvMode) => void;
  setCopied: (fileId: string, copied: CopiedState) => void;
}

export const useDocumentPreviewStore = create<DocumentPreviewStore>((set) => ({
  byFile: {},
  setSheetIndex: (fileId, sheetIndex) =>
    set((state) => ({
      byFile: {
        ...state.byFile,
        [fileId]: { ...state.byFile[fileId], sheetIndex },
      },
    })),
  setZoom: (fileId, zoom) =>
    set((state) => ({
      byFile: {
        ...state.byFile,
        [fileId]: { ...state.byFile[fileId], zoom },
      },
    })),
  setSelection: (fileId, selection) =>
    set((state) => ({
      byFile: {
        ...state.byFile,
        [fileId]: { ...state.byFile[fileId], selection },
      },
    })),
  setCsvMode: (fileId, csvMode) =>
    set((state) => ({
      byFile: {
        ...state.byFile,
        [fileId]: { ...state.byFile[fileId], csvMode },
      },
    })),
  setCopied: (fileId, copied) =>
    set((state) => ({
      byFile: {
        ...state.byFile,
        [fileId]: { ...state.byFile[fileId], copied },
      },
    })),
}));
