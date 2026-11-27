// src/components/media/ImageModelDropdown.tsx
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Lock, ChevronDown } from "lucide-react";
import { useMediaStore } from "../../store/mediaStore";
import type { EntitlementsImageModel } from "../../types";
import { useTranslation } from "react-i18next";

// Per contract, `/me/entitlements` is the single source of truth for
// available image models. No hardcoded fallback.

export function ImageModelDropdown() {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
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

  const models = entitlements?.image.models ?? [];
  const current =
    models.find((m) => m.id === selection.imageModel) ?? models[0];
  if (!current) return null;

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
        <span className="text-muted inline-flex items-center gap-1">
          {current.locked && <Lock className="w-3 h-3" />}
          {current.badge}
        </span>
        <ChevronDown className="w-3 h-3 text-muted" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={reduceMotion ? false : { opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.18, ease: "easeOut" }}
            className="absolute bottom-full mb-2 left-0 w-64 bg-surface border border-line rounded-lg shadow-lg z-50 py-1">
          {models.map((m) => (
            <button
              key={m.id}
              role="menuitem"
              aria-disabled={m.locked}
              onClick={() => handleSelect(m)}
              title={m.locked ? t("media.lockedTooltip") : m.label}
              className="w-full text-left px-3 py-2 hover:bg-surface2 transition-colors flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5">
                {m.locked && (
                  <Lock
                    className="w-3.5 h-3.5 text-muted shrink-0"
                    aria-label={t("media.locked")}
                  />
                )}
                <span className="text-sm">{m.label}</span>
              </span>
              <span className="text-[11px] text-muted whitespace-nowrap">
                {m.badge}
              </span>
            </button>
          ))}
          {models.some((m) => m.locked) && (
            <div className="border-t border-line mt-1 pt-1 px-3 py-1.5">
              <p className="text-[11px] text-muted leading-relaxed">
                {t("media.flux3Note")}
              </p>
            </div>
          )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
