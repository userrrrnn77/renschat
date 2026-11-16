// src/components/blocks/VideoBlockView.tsx
import { useCallback, useEffect, useReducer, useRef } from "react";
import { useMediaUrl, formatRemaining } from "../../hooks/useMediaUrl";
import { useToastStore } from "../../store/toastStore";
import { Skeleton } from "../ui/Skeleton";
import type { VideoBlock } from "../../types";

const REGENERATE_HINT = "Tolong buatkan video yang sama seperti tadi.";

function useExpiryText(expiresAt: string | undefined): string | null {
  const [, force] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    if (!expiresAt) return;
    const t = setInterval(force, 60_000);
    return () => clearInterval(t);
  }, [expiresAt]);
  return formatRemaining(expiresAt);
}

export function VideoBlockView({ block }: { block: VideoBlock }) {
  const { url, loading, expired, error, onError } = useMediaUrl(block.fileId);
  const pushToast = useToastStore((s) => s.push);
  const remaining = useExpiryText(block.expiresAt);
  const copiedRef = useRef(false);

  const handleRegenerate = useCallback(async (): Promise<void> => {
    if (copiedRef.current) return;
    try {
      await navigator.clipboard.writeText(REGENERATE_HINT);
      copiedRef.current = true;
      pushToast("success", "Permintaan disalin, tempel di kolom chat");
    } catch {
      pushToast("error", "Gagal menyalin permintaan");
    }
  }, [pushToast]);

  if (loading) return <Skeleton className="w-full h-64 rounded-xl my-4" />;

  if (expired) {
    return (
      <div className="my-4 p-4 border border-line rounded-xl bg-surface2 text-sm">
        <p className="text-ink font-medium mb-1">Media sudah kedaluwarsa</p>
        <p className="text-muted text-xs mb-2">
          Video ini disimpan hanya 24 jam. Buat ulang bila masih diperlukan.
        </p>
        <button
          type="button"
          onClick={handleRegenerate}
          className="text-xs px-3 py-1.5 rounded-md border border-line hover:bg-surface transition-colors">
          Buat ulang
        </button>
      </div>
    );
  }

  if (!url || error) {
    return (
      <div className="text-sm text-danger my-4">
        Gagal memuat video
        {error?.message ? `: ${error.message}` : ""}
      </div>
    );
  }

  return (
    <div className="my-4">
      <video
        src={url}
        controls
        onError={onError}
        className="w-full max-h-105 rounded-xl border border-line"
      />
      <div className="flex items-center gap-2 mt-2 text-[11px] text-muted">
        {remaining && <span>{remaining}</span>}
        <span>·</span>
        <span>Disimpan 24 jam</span>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          download
          className="ml-auto text-accent hover:underline">
          Unduh
        </a>
      </div>
    </div>
  );
}
