// src/components/media/GenerationToolbar.tsx
import { useEffect } from "react";
import { Image, Video } from "lucide-react";
import { useMediaStore } from "../../store/mediaStore";
import { ImageModelDropdown } from "./ImageModelDropdown";
import { VideoOptionsPopover } from "./VideoOptionsPopover";
import { CreditBadge } from "./CreditBadge";
import { cn } from "../../lib/cn";
import { useTranslation } from "react-i18next";

export function GenerationToolbar({
  composerKey,
  disabled,
}: {
  composerKey: string;
  disabled: boolean;
}) {
  const { t } = useTranslation();

  const mode = useMediaStore((s) => s.selection.mode);
  const setMode = useMediaStore((s) => s.setMode);
  const entitlements = useMediaStore((s) => s.entitlements);
  const fetchEntitlements = useMediaStore((s) => s.fetchEntitlements);

  useEffect(() => {
    if (entitlements === null) void fetchEntitlements();
  }, [entitlements, fetchEntitlements]);

  // Media kill switch dimatikan → sembunyikan toolbar.
  if (entitlements !== null && !entitlements.mediaEnabled) return null;

  return (
    <div className="flex items-center gap-1.5 mb-2 flex-wrap">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setMode(mode === "image" ? "auto" : "image")}
        aria-pressed={mode === "image"}
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors",
          mode === "image"
            ? "bg-accent/10 border-accent text-ink"
            : "bg-surface2 border-line text-muted hover:text-ink",
          disabled && "opacity-50 cursor-not-allowed",
        )}>
        <Image className="w-3.5 h-3.5" />
        {t("media.image")}
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setMode(mode === "video" ? "auto" : "video")}
        aria-pressed={mode === "video"}
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors",
          mode === "video"
            ? "bg-accent/10 border-accent text-ink"
            : "bg-surface2 border-line text-muted hover:text-ink",
          disabled && "opacity-50 cursor-not-allowed",
        )}>
        <Video className="w-3.5 h-3.5" />
        {t("media.video")}
      </button>

      {mode === "image" && <ImageModelDropdown />}
      {mode === "video" && <VideoOptionsPopover composerKey={composerKey} />}
      {mode === "auto" && <ImageModelDropdown />}

      <CreditBadge />
    </div>
  );
}
