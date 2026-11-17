// src/components/ui/ConfirmModal.tsx
import { useEffect, useRef } from "react";
import { Modal } from "./Modal";
import { useConfirmStore } from "../../store/confirmStore";
import { cn } from "../../lib/cn";
import { useTranslation } from "react-i18next";

export function ConfirmModal() {
  const { t } = useTranslation();

  const { open, options, confirm, cancel } = useConfirmStore();
  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  const variant = options?.variant ?? "danger";
  const confirmLabel = options?.confirmLabel ?? t("common.confirm");
  const cancelLabel = options?.cancelLabel ?? t("common.cancel");

  // Autofocus: destructive → fokus tombol Batal (safety). Primary →
  // fokus tombol utama (Enter langsung konfirmasi).
  useEffect(() => {
    if (!open) return;
    const target =
      variant === "danger" ? cancelBtnRef.current : confirmBtnRef.current;
    target?.focus();
  }, [open, variant]);

  // Enter / Escape global handling saat dialog terbuka. Modal sudah
  // handle Escape via onClose, tapi kita tangkap Escape di sini juga
  // agar jelas bahwa Escape = cancel (bukan onClose yang ambigu).
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        // Enter trigger tombol yang sedang focused (biasanya salah satu
        // dari dua tombol ini). Kalau fokus di luar modal (mis. body),
        // default ke cancel untuk safety.
        const active = document.activeElement;
        if (
          active === cancelBtnRef.current ||
          active === confirmBtnRef.current
        ) {
          return; // biarkan native button behavior
        }
        e.preventDefault();
        cancel();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, cancel]);

  if (!options) return null;

  return (
    <Modal open={open} onClose={cancel}>
      <h2 className="text-lg font-semibold text-ink">{options.title}</h2>
      {options.description && (
        <p className="text-sm text-muted mt-2 whitespace-pre-line">
          {options.description}
        </p>
      )}
      <div className="flex items-center justify-end gap-2 mt-6">
        <button
          ref={cancelBtnRef}
          type="button"
          onClick={cancel}
          className="px-4 py-2 text-sm font-medium bg-surface2 hover:bg-line text-ink rounded-lg transition-colors">
          {cancelLabel}
        </button>
        <button
          ref={confirmBtnRef}
          type="button"
          onClick={confirm}
          className={cn(
            "px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors",
            variant === "danger"
              ? "bg-danger hover:bg-danger/90"
              : "bg-accent hover:bg-accent-hover",
          )}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
