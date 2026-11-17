import { formatBytes } from "../../lib/files";
import { X, RotateCcw, FileText } from "lucide-react";
import type { AttachmentUpload } from "../../lib/upload";
import { cn } from "../../lib/cn";
import { useTranslation } from "react-i18next";

const UPLOADING_STATES: ReadonlySet<AttachmentUpload["state"]> = new Set([
  "queued",
  "presigning",
  "uploading",
  "completing",
  "processing",
]);

export function AttachmentChip({
  attachment,
  onRemove,
  onRetry,
}: {
  attachment: AttachmentUpload;
  onRemove: () => void;
  onRetry: () => void;
}) {
  const { t } = useTranslation();

  const isImage = attachment.mime.startsWith("image/");
  const isFailed = attachment.state === "failed";
  const isUploading = UPLOADING_STATES.has(attachment.state);

  return (
    <div
      className={cn(
        "relative flex items-center gap-2 border rounded-lg px-3 py-1.5 text-xs bg-surface overflow-hidden",
        isFailed ? "border-danger/50" : "border-line",
      )}>
      {isImage && attachment.localUrl ? (
        <img
          src={attachment.localUrl}
          alt=""
          className="w-6 h-6 rounded object-cover"
        />
      ) : (
        <FileText className="w-4 h-4 text-muted" />
      )}
      <div className="flex flex-col truncate max-w-30">
        <span className="truncate font-medium">{attachment.name}</span>
        <span className="text-muted">
          {isUploading
            ? `${attachment.state === "processing" ? t("upload.processing") : t("upload.uploading")}… ${attachment.progress}%`
            : formatBytes(attachment.size)}
        </span>
      </div>

      {isUploading && (
        <div
          className="absolute bottom-0 left-0 h-0.5 bg-accent transition-all"
          style={{ width: `${attachment.progress}%` }}
        />
      )}

      <button
        onClick={isFailed ? onRetry : onRemove}
        className="p-1 hover:bg-surface2 rounded-md transition-colors ml-1"
        title={
          isFailed
            ? t("upload.retry")
            : isUploading
              ? t("upload.cancelUpload")
              : t("upload.remove")
        }>
        {isFailed ? (
          <RotateCcw className="w-3.5 h-3.5 text-danger" />
        ) : isUploading ? (
          <X className="w-3.5 h-3.5 text-danger" />
        ) : (
          <X className="w-3.5 h-3.5 text-muted" />
        )}
      </button>
    </div>
  );
}
