// REPLACE: seluruh komponen
import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useUIStore } from "../../store/uiStore";
import type { SourceRef } from "../../types";
import { api } from "../../lib/api";
import { Spinner } from "../ui/Spinner";

const MAX_VISIBLE = 6;

export function SourcesList({ sources }: { sources: SourceRef[] }) {
  const { t } = useTranslation();
  const openPreview = useUIStore((s) => s.openPreview);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Deduplikasi: Kalau ada 5 chunk dari file yang sama, UI cukup nampilin 1 chip file itu.
  const uniqueSources = useMemo(() => {
    const seen = new Set<string>();
    return sources.filter((s) => {
      if (seen.has(s.fileId)) return false;
      seen.add(s.fileId);
      return true;
    });
  }, [sources]);

  if (uniqueSources.length === 0) return null;

  const visible = uniqueSources.slice(0, MAX_VISIBLE);
  const overflow = uniqueSources.length - visible.length;

  const handleOpen = async (src: SourceRef): Promise<void> => {
    if (loadingId) return;
    setLoadingId(src.fileId);
    try {
      // Fetch metadata dulu biar tau ini PDF, gambar, atau teks
      const meta = await api.files.get(src.fileId);
      openPreview({
        type: "file",
        fileId: src.fileId,
        name: meta.name,
        mime: meta.mime,
        size: meta.size,
        version: meta.version,
        preview: meta.mime.startsWith("image/")
          ? "image"
          : meta.mime === "application/pdf"
            ? "pdf"
            : "text",
      });
    } catch {
      // Fallback
      openPreview({
        type: "file",
        fileId: src.fileId,
        name: src.name,
        mime: "text/plain",
        size: 0,
        version: 1,
        preview: "text",
      });
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {visible.map((s) => (
        <button
          key={`${s.fileId}-${s.idx}-${s.n}`}
          onClick={() => handleOpen(s)}
          disabled={loadingId === s.fileId}
          title={s.snippet}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs bg-surface2 hover:bg-line border border-line rounded-full transition-colors max-w-60">
          {loadingId === s.fileId ? (
            <Spinner className="w-3 h-3" />
          ) : (
            <span className="font-mono text-[10px] bg-accent/20 text-accent px-1 rounded shrink-0">
              [{s.n}]
            </span>
          )}
          <span className="truncate">{s.name}</span>
        </button>
      ))}
      {overflow > 0 && (
        <span className="text-xs text-muted px-2 py-1">
          {t("chat.moreSources", { count: overflow })}
        </span>
      )}
    </div>
  );
}
