import { useEffect } from "react";
import { Image } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/cn";
import { useMediaStore } from "../../store/mediaStore";
import { CreditBadge } from "./CreditBadge";
import { ImageModelDropdown } from "./ImageModelDropdown";

type GenerationToolbarProps = {
  composerKey: string;
  disabled: boolean;
};

export function GenerationToolbar({ disabled }: GenerationToolbarProps) {
  const { t } = useTranslation();
  const mode = useMediaStore((s) => s.selection.mode);
  const setMode = useMediaStore((s) => s.setMode);
  const entitlements = useMediaStore((s) => s.entitlements);
  const fetchEntitlements = useMediaStore((s) => s.fetchEntitlements);

  useEffect(() => {
    if (entitlements === null) void fetchEntitlements();
  }, [entitlements, fetchEntitlements]);

  useEffect(() => {
    if (mode === "video") setMode("auto");
  }, [mode, setMode]);

  if (!entitlements || !entitlements.mediaEnabled) return null;

  const imageSelected = mode === "image";

  return (
    <div className="flex min-h-9 flex-wrap items-center gap-1.5">
      <button
        type="button"
        disabled={disabled}
        aria-pressed={imageSelected}
        onClick={() => setMode(imageSelected ? "auto" : "image")}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
          imageSelected
            ? "border-accent bg-accent/10 text-ink"
            : "border-line bg-surface2 text-muted hover:text-ink",
          disabled && "cursor-not-allowed opacity-50",
        )}>
        <Image className="h-3.5 w-3.5" />
        {t("media.image")}
      </button>

      <ImageModelDropdown />
      <CreditBadge />
    </div>
  );
}
