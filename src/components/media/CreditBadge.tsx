// src/components/media/CreditBadge.tsx
import { useMediaStore } from "../../store/mediaStore";

export function CreditBadge() {
  const entitlements = useMediaStore((s) => s.entitlements);
  if (!entitlements || !entitlements.isDonor) return null;

  const { imageFlux3, videoCosmos } = entitlements.credits;
  if (imageFlux3 === 0 && videoCosmos === 0) return null;

  return (
    <div className="ml-auto inline-flex items-center gap-2 text-xs text-muted px-2 py-1 rounded-md bg-surface2 border border-line">
      <span title="Kredit gambar FLUX.3">🖼 {imageFlux3}</span>
      <span className="text-muted/50">·</span>
      <span title="Kredit video Cosmos">🎬 {videoCosmos}</span>
    </div>
  );
}
