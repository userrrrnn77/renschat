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
  videoAspect: MediaVideoAspect | "auto";
  videoEngine: MediaVideoEngine;
}

const DEFAULT_SELECTION: MediaSelection = {
  mode: "auto",
  imageModel: "flux2-klein",
  videoAspect: "auto",
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

  setMode: (mode) => {
    // Backend contract: `generation.mode === "video"` is rejected with
    // MEDIA_DISABLED. Never surface video as a selectable mode.
    if (mode === "video") return;
    set((s) => ({ selection: { ...s.selection, mode } }));
  },

  resetSelection: () => set({ selection: { ...DEFAULT_SELECTION } }),

  setDonateOpen: (v) => set({ donateOpen: v }),
}));

/**
 * Build body `generation` dari selection (§7.7). `entitlements` adalah satu-
 * satunya sumber capability: tidak ada generation yang dibangun tanpa
 * entitlements yang mengizinkannya. Kontrak backend saat ini menolak
 * `generation.mode === "video"` dengan MEDIA_DISABLED, jadi mode video
 * maupun opsi video tidak pernah dikirim.
 */
export function buildGeneration(
  selection: MediaSelection,
  entitlements: Entitlements | null,
): GenerationInput | undefined {
  if (!entitlements || !entitlements.mediaEnabled) return undefined;

  const unlockedImageIds = new Set(
    entitlements.image.models.filter((m) => !m.locked).map((m) => m.id),
  );
  const imageExplicit =
    selection.imageModel === "flux3-klein" &&
    unlockedImageIds.has("flux3-klein");

  // Video mode is rejected by the backend regardless of entitlements state.
  const requestedMode = selection.mode === "video" ? "auto" : selection.mode;

  if (requestedMode === "auto" && !imageExplicit) return undefined;

  const gen: GenerationInput = {};
  if (requestedMode === "image") gen.mode = "image";
  if (imageExplicit) gen.imageModel = "flux3-klein";
  return Object.keys(gen).length > 0 ? gen : undefined;
}
