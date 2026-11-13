// src/store/confirmStore.ts
import { create } from "zustand";

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `danger` → tombol utama merah (aksi destruktif). Default: `danger`. */
  variant?: "danger" | "primary";
}

interface ConfirmState {
  open: boolean;
  options: ConfirmOptions | null;
  resolver: ((value: boolean) => void) | null;
  /**
   * Tampilkan dialog confirm. Resolve `true` bila user konfirmasi,
   * `false` bila batal / ditutup / sudah ada dialog lain terbuka.
   */
  request: (opts: ConfirmOptions) => Promise<boolean>;
  confirm: () => void;
  cancel: () => void;
}

export const useConfirmStore = create<ConfirmState>((set, get) => ({
  open: false,
  options: null,
  resolver: null,

  request: (opts) => {
    return new Promise<boolean>((resolve) => {
      // Guard: kalau sudah ada dialog terbuka, reject request baru
      // dengan `false` — mencegah resolver lama tertimpa (memory leak +
      // caller baru menggantung selamanya). User intent dipreservasi:
      // caller baru tidak akan melakukan aksi destruktif apa pun.
      if (get().open) {
        resolve(false);
        return;
      }
      set({ open: true, options: opts, resolver: resolve });
    });
  },

  confirm: () => {
    const r = get().resolver;
    set({ open: false, options: null, resolver: null });
    r?.(true);
  },

  cancel: () => {
    const r = get().resolver;
    set({ open: false, options: null, resolver: null });
    r?.(false);
  },
}));
