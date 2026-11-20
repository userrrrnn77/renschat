// src/components/media/VideoOptionsPopover.tsx
import { useEffect, useRef, useState } from "react";
import { useMediaStore } from "../../store/mediaStore";
import { useComposerStore } from "../../store/composerStore";
import { cn } from "../../lib/cn";
import { useTranslation } from "react-i18next";

const VIDEO_SAMPLES = [
  "Animasi logo neon berputar di latar gelap",
  "Grafik batang naik dengan transisi halus",
  "Matahari terbenam di pantai, gaya kartun",
];

export function VideoOptionsPopover({ composerKey }: { composerKey: string }) {
  const { t } = useTranslation();

  const entitlements = useMediaStore((s) => s.entitlements);
  const selection = useMediaStore((s) => s.selection);
  const setSelection = useMediaStore((s) => s.setSelection);
  const setText = useComposerStore((s) => s.setText);
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

  const engine = selection.videoEngine;
  const autoLabel =
    entitlements?.video.engine === "cosmos"
      ? `${t("media.autoCosmos")}`
      : `${t("media.auto")}`;

  const handleSample = (text: string): void => {
    setText(composerKey, text);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-surface2 hover:bg-line border border-line text-ink transition-colors"
        aria-haspopup="dialog"
        aria-expanded={open}>
        <span>
          {selection.videoAspect === "auto"
            ? "Rasio otomatis"
            : selection.videoAspect}
        </span>
        <span className="text-muted">·</span>
        <span className="text-muted">
          {engine === "auto"
            ? "Otomatis"
            : engine === "python"
              ? "Python"
              : "Cosmos3"}
        </span>
        <span className="text-muted">▾</span>
      </button>
      {open && (
        <>
          {/* Overlay mobile-only untuk feel bottom sheet */}
          <div
            className="fixed inset-0 bg-black/30 z-40 md:hidden"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-label={t("media.videoOptions")}
            className={cn(
              "absolute bottom-full mb-2 left-0 w-80 bg-surface border border-line rounded-lg shadow-lg z-50 p-3 animate-in fade-in slide-in-from-bottom-2",
              "max-md:fixed max-md:top-auto max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:w-full max-md:rounded-t-2xl max-md:rounded-b-none",
            )}>
            <div className="mb-3">
              <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-1.5">
                {t("media.ratio")}
              </p>
              <div className="flex gap-2">
                {(["auto", "16:9", "9:16"] as const).map((aspect) => (
                  <button
                    key={aspect}
                    type="button"
                    onClick={() => setSelection({ videoAspect: aspect })}
                    className={cn(
                      "flex-1 flex flex-col items-center gap-1.5 p-2 rounded-md border transition-colors",
                      selection.videoAspect === aspect
                        ? "border-accent bg-accent/10"
                        : "border-line hover:bg-surface2",
                    )}>
                    {aspect !== "auto" && (
                      <span
                        aria-hidden="true"
                        className={cn(
                          "border border-muted/50 rounded-sm",
                          aspect === "16:9" ? "w-10 h-6" : "w-6 h-10",
                        )}
                      />
                    )}
                    <span className="text-xs">
                      {aspect === "auto" ? "Otomatis" : aspect}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-3">
              <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-1.5">
                {t("media.engine")}
              </p>
              <div className="flex gap-2">
                {[
                  { id: "auto" as const, label: autoLabel },
                  { id: "python" as const, label: t("media.pythonFree") },
                ].map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => setSelection({ videoEngine: e.id })}
                    className={cn(
                      "flex-1 px-2 py-1.5 rounded-md border text-xs transition-colors",
                      selection.videoEngine === e.id
                        ? "border-accent bg-accent/10"
                        : "border-line hover:bg-surface2",
                    )}>
                    {e.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-1.5">
                {t("media.examples")}
              </p>
              <div className="flex flex-col gap-1.5">
                {VIDEO_SAMPLES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleSample(s)}
                    className="text-left text-xs px-2 py-1.5 rounded-md bg-surface2 hover:bg-line border border-line transition-colors">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
