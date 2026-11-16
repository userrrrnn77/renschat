// src/components/media/ImageModelDropdown.tsx
import { useEffect, useRef, useState } from "react";
import { useMediaStore } from "../../store/mediaStore";
import type { EntitlementsImageModel } from "../../types";

const FALLBACK_MODELS: EntitlementsImageModel[] = [
  {
    id: "flux2-klein",
    label: "FLUX.2 Klein 4B",
    locked: false,
    badge: "Gratis",
  },
  {
    id: "flux3-klein",
    label: "FLUX.3 Image Klein",
    locked: true,
    badge: "10 kredit",
    reason: "DONATION_REQUIRED",
  },
];

export function ImageModelDropdown() {
  const entitlements = useMediaStore((s) => s.entitlements);
  const selection = useMediaStore((s) => s.selection);
  const setSelection = useMediaStore((s) => s.setSelection);
  const setDonateOpen = useMediaStore((s) => s.setDonateOpen);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, []);

  const models = entitlements?.image.models ?? FALLBACK_MODELS;
  const current =
    models.find((m) => m.id === selection.imageModel) ?? models[0];

  const handleSelect = (m: EntitlementsImageModel): void => {
    if (m.locked) {
      setDonateOpen(true);
      setOpen(false);
      return;
    }
    setSelection({ imageModel: m.id });
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-surface2 hover:bg-line border border-line text-ink transition-colors"
        aria-haspopup="menu"
        aria-expanded={open}>
        <span>{current.label}</span>
        <span className="text-muted">
          {current.locked ? "🔒" : ""} {current.badge}
        </span>
        <span className="text-muted">▾</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute top-full mt-1 left-0 w-64 bg-surface border border-line rounded-lg shadow-lg z-50 py-1 animate-in fade-in slide-in-from-top-2">
          {models.map((m) => (
            <button
              key={m.id}
              role="menuitem"
              aria-disabled={m.locked}
              onClick={() => handleSelect(m)}
              title={
                m.locked
                  ? "Terbuka setelah traktir kopi di Ko-fi (opsional)"
                  : m.label
              }
              className="w-full text-left px-3 py-2 hover:bg-surface2 transition-colors flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5">
                {m.locked && (
                  <span aria-hidden="true" aria-label="Terkunci">
                    🔒
                  </span>
                )}
                <span className="text-sm">{m.label}</span>
              </span>
              <span className="text-[11px] text-muted whitespace-nowrap">
                {m.badge}
              </span>
            </button>
          ))}
          <div className="border-t border-line mt-1 pt-1 px-3 py-1.5">
            <p className="text-[11px] text-muted leading-relaxed">
              FLUX.3 membuka akses model lebih berat. Semua fitur tetap gratis.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
