import { useEffect, useRef, useState } from "react";
import { Modal } from "./Modal";
import { useConfirmStore } from "../../store/confirmStore";
import { cn } from "../../lib/cn";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Trash2 } from "lucide-react";

export function ConfirmModal() {
  const { t } = useTranslation();

  const { open, options, confirm, cancel } = useConfirmStore();
  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  // Snapshot agar konten tetap terlihat selama exit animation meskipun
  // store sudah mengosongkan options.
  const [displayedOptions, setDisplayedOptions] = useState(options);

  useEffect(() => {
    if (options) setDisplayedOptions(options);
  }, [options]);

  const variant = displayedOptions?.variant ?? "danger";
  const confirmLabel = displayedOptions?.confirmLabel ?? t("common.confirm");
  const cancelLabel = displayedOptions?.cancelLabel ?? t("common.cancel");

  useEffect(() => {
    if (!open) return;
    const target =
      variant === "danger" ? cancelBtnRef.current : confirmBtnRef.current;
    target?.focus();
  }, [open, variant]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        const active = document.activeElement;
        if (
          active === cancelBtnRef.current ||
          active === confirmBtnRef.current
        ) {
          return;
        }
        e.preventDefault();
        cancel();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, cancel]);

  if (!displayedOptions) return null;

  return (
    <Modal
      open={open}
      onClose={cancel}
      onExitComplete={() => setDisplayedOptions(null)}>
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "p-2.5 rounded-xl shrink-0",
              variant === "danger"
                ? "bg-danger/10 text-danger"
                : "bg-accent/10 text-accent",
            )}>
            {variant === "danger" ? (
              <Trash2 className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
          </div>
          <div>
            <h2 className="text-base font-semibold text-ink">
              {displayedOptions.title}
            </h2>
            {displayedOptions.description && (
              <p className="text-xs text-muted mt-1 leading-relaxed whitespace-pre-line">
                {displayedOptions.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-2">
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={cancel}
            className="px-4 py-2 text-xs font-medium bg-surface2 hover:bg-line text-ink rounded-xl transition-colors">
            {cancelLabel}
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            onClick={confirm}
            className={cn(
              "px-4 py-2 text-xs font-medium text-white rounded-xl transition-colors shadow-sm",
              variant === "danger"
                ? "bg-danger hover:bg-danger/90"
                : "bg-accent hover:bg-accent-hover",
            )}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
