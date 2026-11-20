import { useState } from "react";
import { FileText, ImageOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatBytes, getExt, isCode } from "../../lib/files";
import { useUIStore } from "../../store/uiStore";
import type { FileBlock } from "../../types";

interface AttachmentCardProps {
  id: string;
  name: string;
  mime: string;
  size: number;
  localFile?: File;
  localUrl?: string | undefined;
  compact?: boolean;
  status?: string | undefined;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

function previewKind(name: string, mime: string): FileBlock["preview"] {
  const ext = getExt(name);

  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf" || ext === "pdf") return "pdf";
  if (isCode(ext)) return "code";

  if (
    mime.startsWith("text/") ||
    ["txt", "md", "markdown", "csv", "log", "env"].includes(ext)
  ) {
    return "text";
  }

  return "none";
}

export function AttachmentCard({
  id,
  name,
  mime,
  size,
  localFile,
  localUrl,
  compact = false,
  status,
}: AttachmentCardProps) {
  const { t } = useTranslation();
  const openPreview = useUIStore((s) => s.openPreview);
  const setLightbox = useUIStore((s) => s.setLightbox);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  const preview = previewKind(name, mime);
  const src = localFile
    ? localUrl
    : `${API_BASE}/api/files/${encodeURIComponent(id)}/download`;

  const label = t("preview.openFile", { name });
  const focus = "focus-visible:outline-2 focus-visible:outline-accent";

  if (preview === "image" && src && failedSrc !== src) {
    return (
      <button
        type="button"
        aria-label={label}
        title={name}
        onClick={() => setLightbox(src)}
        className={`relative block w-fit max-w-full overflow-hidden rounded-xl border border-line bg-surface ${focus}`}>
        <img
          src={src}
          crossOrigin={localFile ? undefined : "use-credentials"}
          alt={name}
          loading={compact ? "eager" : "lazy"}
          onError={() => setFailedSrc(src)}
          className={
            compact
              ? "block h-auto max-h-24 w-auto max-w-full object-contain sm:max-w-44"
              : "block h-auto max-h-72 w-auto max-w-full object-contain sm:max-w-96"
          }
        />

        {status && (
          <span className="absolute inset-x-0 bottom-0 bg-black/70 px-2 py-1 text-center text-[10px] text-white">
            {status}
          </span>
        )}
      </button>
    );
  }

  function openFile() {
    openPreview({
      type: "file",
      fileId: id,
      name,
      mime,
      size,
      version: 1,
      preview,
      ...(localFile ? { localFile } : {}),
    });
  }

  const Icon = preview === "image" ? ImageOff : FileText;

  return (
    <button
      type="button"
      aria-label={label}
      title={name}
      onClick={openFile}
      className={`flex aspect-square max-w-full flex-col items-start justify-between rounded-xl border border-line bg-surface p-2.5 text-left hover:bg-surface2 ${focus} ${
        compact ? "w-24" : "w-28"
      }`}>
      <Icon aria-hidden="true" className="size-5 shrink-0 text-muted" />

      <span className="block w-full min-w-0">
        <span className="line-clamp-2 break-all text-xs font-medium leading-tight text-ink">
          {name}
        </span>
        <span className="mt-1 block truncate text-[10px] text-muted">
          {status || formatBytes(size)}
        </span>
      </span>
    </button>
  );
}
