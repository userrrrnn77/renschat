// src/components/blocks/ImageBlockView.tsx
import { useCallback, useEffect, useReducer, useRef } from "react";
import { useMediaUrl, formatRemaining } from "../../hooks/useMediaUrl";
import { useUIStore } from "../../store/uiStore";
import { useToastStore } from "../../store/toastStore";
import { Skeleton } from "../ui/Skeleton";
import type { ImageBlock } from "../../types";
import { useTranslation } from "react-i18next";

function useExpiryText(expiresAt: string | undefined): string | null {
  const [, force] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    if (!expiresAt) return;
    const t = setInterval(force, 60_000);
    return () => clearInterval(t);
  }, [expiresAt]);
  return formatRemaining(expiresAt);
}

export function ImageBlockView({ block }: { block: ImageBlock }) {
  const { t } = useTranslation();

  const { url, loading, expired, error, onError } = useMediaUrl(block.fileId);
  const setLightbox = useUIStore((s) => s.setLightbox);
  const pushToast = useToastStore((s) => s.push);
  const remaining = useExpiryText(block.expiresAt);
  const copiedRef = useRef(false);

  const handleCopyPrompt = useCallback(async (): Promise<void> => {
    if (!block.alt || copiedRef.current) return;
    try {
      await navigator.clipboard.writeText(block.alt);
      copiedRef.current = true;
      pushToast("success", t("blocks.copyPromptSuccess"));
    } catch {
      pushToast("error", t("blocks.copyPromptError"));
    }
  }, [block.alt, pushToast]);

  if (loading) return <Skeleton className="w-full h-64 rounded-xl my-4" />;

  if (expired) {
    return (
      <div className="my-4 p-4 border border-line rounded-xl bg-surface2 text-sm">
        <p className="text-ink font-medium mb-1">
          {t("blocks.imageExpiredTitle")}
        </p>
        <p className="text-muted text-xs mb-2">
          {t("blocks.imageExpiredDesc")}
        </p>
        {block.alt && (
          <button
            type="button"
            onClick={handleCopyPrompt}
            className="text-xs px-3 py-1.5 rounded-md border border-line hover:bg-surface transition-colors">
            {t("blocks.copyPrompt")}
          </button>
        )}
      </div>
    );
  }

  if (!url || error) {
    return (
      <div className="text-sm text-danger my-4">
        {t("blocks.imageLoadError")}
        {error?.message ? `: ${error.message}` : ""}
      </div>
    );
  }

  return (
    <div className="my-4">
      <img
        src={url}
        alt={block.alt || "Gambar"}
        onError={onError}
        onClick={() => setLightbox(url)}
        className="max-h-105 rounded-xl object-contain cursor-pointer border border-line"
      />
      <div className="flex items-center gap-2 mt-2 text-[11px] text-muted">
        {remaining && <span>{remaining}</span>}
        <span>·</span>
        <span>{t("blocks.stored24h")}</span>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          download
          className="ml-auto text-accent hover:underline">
          {t("common.download")}
        </a>
      </div>
    </div>
  );
}
