// src/components/preview/OfficePdfViewer.tsx
import { Download, FileWarning, Loader2, UploadCloud } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { FileBlock } from "../../types";
import { officeKind } from "../../lib/officeKind";
import { isValidServerFileId, useOfficePdf } from "../../hooks/useOfficePdf";
import { PdfViewer } from "./PdfViewer";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

export function OfficePdfViewer({ file }: { file: FileBlock }) {
  const { t } = useTranslation();
  const state = useOfficePdf(file);

  if (state.kind === "loading") {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>
          {t("preview.loading", { defaultValue: "Loading preview…" })}
        </span>
      </div>
    );
  }

  if (state.kind === "waiting-upload") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="rounded-2xl bg-surface2 p-4 text-muted">
          <UploadCloud className="h-8 w-8" />
        </div>
        <p className="max-w-sm text-sm text-muted">
          {t("preview.waitingUpload", {
            defaultValue:
              "Preview is available after the upload finishes. Please retry once the file is saved.",
          })}
        </p>
        {file.localFile && (
          <p className="text-xs text-muted">
            {file.localFile.name} · {Math.ceil(file.localFile.size / 1024)} KB
          </p>
        )}
      </div>
    );
  }

  if (state.kind === "error") {
    const reasonKey =
      state.reason === "expired"
        ? "preview.expired"
        : state.reason === "missing"
          ? "preview.missing"
          : state.reason === "unsupported"
            ? "preview.unsupported"
            : state.reason === "converter"
              ? "preview.converterUnavailable"
              : "preview.loadError";

    const fallbackDefault =
      state.reason === "converter"
        ? "Document conversion is not available on this server. Download the original file to view it."
        : state.reason === "unsupported"
          ? "Preview is not supported for this document type."
          : "Preview could not be loaded.";

    const showDownload = isValidServerFileId(file.fileId);

    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="rounded-2xl bg-danger/10 p-4 text-danger">
          <FileWarning className="h-8 w-8" />
        </div>
        <p className="max-w-sm text-sm text-muted">
          {t(reasonKey, { defaultValue: fallbackDefault })}
        </p>
        {showDownload && (
          <a
            href={`${API_BASE}/api/files/${encodeURIComponent(file.fileId)}/download`}
            download
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-xs font-medium text-accent-fg transition-colors hover:bg-accent-hover">
            <Download className="h-4 w-4" />
            {t("common.download", { defaultValue: "Download" })}
          </a>
        )}
      </div>
    );
  }

  const kind = officeKind(file.name);
  const badge = kind === "pptx" || kind === "ppt" ? "slide" : "page";

  return <PdfViewer url={state.url} filename={file.name} badge={badge} />;
}
