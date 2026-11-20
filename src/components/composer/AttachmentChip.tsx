import { RotateCcw, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { AttachmentUpload } from "../../lib/upload";
import { AttachmentCard } from "../preview/AttachmentCard";

interface Props {
  attachment: AttachmentUpload;
  onRemove: () => void;
  onRetry: () => void;
}

export function AttachmentChip({ attachment, onRemove, onRetry }: Props) {
  const { t } = useTranslation();

  const failed = attachment.state === "failed";
  const busy = !failed && attachment.state !== "ready";

  const status = busy
    ? attachment.state === "processing"
      ? t("upload.processing")
      : `${t("upload.uploading")} ${attachment.progress}%`
    : undefined;

  const removeLabel = t(busy ? "upload.cancelUpload" : "upload.remove");
  const actionClass =
    "grid size-6 place-items-center rounded-full border border-line bg-surface text-muted shadow-sm hover:bg-surface2 hover:text-ink focus-visible:outline-2 focus-visible:outline-accent";

  return (
    <div className="relative w-fit max-w-full self-start">
      <AttachmentCard
        compact
        id={attachment.fileId ?? attachment.localId}
        name={attachment.name}
        mime={attachment.mime}
        size={attachment.size}
        localFile={attachment.file}
        localUrl={attachment.localUrl}
        status={status}
      />

      <div className="absolute top-1 right-1 flex gap-1">
        {failed && (
          <button
            type="button"
            onClick={onRetry}
            title={attachment.error || t("upload.retry")}
            aria-label={t("upload.retry")}
            className={actionClass}>
            <RotateCcw className="size-3.5 text-danger" />
          </button>
        )}

        <button
          type="button"
          onClick={onRemove}
          title={removeLabel}
          aria-label={removeLabel}
          className={actionClass}>
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
