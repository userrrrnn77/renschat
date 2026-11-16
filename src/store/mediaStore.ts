// src/store/mediaStore.ts
import { create } from "zustand";
import { api } from "../lib/api";
import type { Entitlements, GenerationInput } from "../types";

export type MediaMode = "auto" | "image" | "video";
export type MediaImageModel = "flux2-klein" | "flux3-klein";
export type MediaVideoAspect = "16:9" | "9:16";
export type MediaVideoEngine = "auto" | "cosmos" | "python";

export interface MediaSelection {
  mode: MediaMode;
  imageModel: MediaImageModel;
  videoAspect: MediaVideoAspect;
  videoEngine: MediaVideoEngine;
}

const DEFAULT_SELECTION: MediaSelection = {
  mode: "auto",
  imageModel: "flux2-klein",
  videoAspect: "16:9",
  videoEngine: "auto",
};

interface MediaState {
  entitlements: Entitlements | null;
  loadingEntitlements: boolean;
  entitlementsError: string | null;
  selection: MediaSelection;
  donateOpen: boolean;
  fetchEntitlements: () => Promise<void>;
  setSelection: (patch: Partial<MediaSelection>) => void;
  setMode: (mode: MediaMode) => void;
  resetSelection: () => void;
  setDonateOpen: (v: boolean) => void;
}

export const useMediaStore = create<MediaState>((set, get) => ({
  entitlements: null,
  loadingEntitlements: false,
  entitlementsError: null,
  selection: { ...DEFAULT_SELECTION },
  donateOpen: false,

  fetchEntitlements: async () => {
    if (get().loadingEntitlements) return;
    set({ loadingEntitlements: true, entitlementsError: null });
    try {
      const data = await api.me.entitlements();
      set({ entitlements: data, loadingEntitlements: false });
    } catch (err) {
      set({
        loadingEntitlements: false,
        entitlementsError:
          err instanceof Error ? err.message : "Gagal memuat status akun",
      });
    }
  },

  setSelection: (patch) =>
    set((s) => ({ selection: { ...s.selection, ...patch } })),

  setMode: (mode) => set((s) => ({ selection: { ...s.selection, mode } })),

  resetSelection: () => set({ selection: { ...DEFAULT_SELECTION } }),

  setDonateOpen: (v) => set({ donateOpen: v }),
}));

/**
 * Build body `generation` dari selection (§7.7). Kembalikan undefined bila
 * semua default — request body tetap ringkas. Flux3 dipilih eksplisit tetap
 * dikirim meski mode auto supaya backend route ke flux3 (§8.1).
 */
export function buildGeneration(
  selection: MediaSelection,
): GenerationInput | undefined {
  const imageExplicit = selection.imageModel === "flux3-klein";
  const videoExplicit =
    selection.videoEngine !== "auto" || selection.videoAspect !== "16:9";

  if (selection.mode === "auto" && !imageExplicit && !videoExplicit) {
    return undefined;
  }

  const gen: GenerationInput = { mode: selection.mode };
  if (imageExplicit) gen.imageModel = selection.imageModel;
  if (videoExplicit) {
    gen.video = {
      aspect: selection.videoAspect,
      engine: selection.videoEngine,
    };
  }
  return gen;
}
