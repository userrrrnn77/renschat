import { useMemo, useState } from "react";
import { Check, Copy, Download, Maximize2, Minimize2, X, FileText } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { FileBlock } from "../../types";
import { useFilePreview } from "../../hooks/useFilePreview";
import { copyToClipboard } from "../../lib/copy";
import { getExt } from "../../lib/files";
import { highlightCode } from "../../lib/highlight";
import { Markdown } from "../ui/Markdown";
import { Skeleton } from "../ui/Skeleton";
import { OfficeContent } from "./OfficeContent";
import { CsvContent } from "./CsvContent";
import { OfficePdfViewer } from "./OfficePdfViewer";
import { isPdfRenderableOffice, officeKind } from "../../lib/officeKind";
import { usePreviewStore } from "../../store/usePreviewStore";
import { useDocumentPreviewStore } from "../../store/useDocumentPreviewStore";

interface Props {
  file: FileBlock;
  onClose: () => void;
}

const ERROR_KEYS = {
  expired: "preview.expired",
  missing: "preview.missing",
  binary: "preview.binaryError",
  load: "preview.loadError",
} as const;

export function FilePreviewPanel({ file, onClose }: Props) {
  const { t } = useTranslation();
  const state = useFilePreview(file);
  const [showRaw, setShowRaw] = useState(false);
  const copied = useDocumentPreviewStore(
    (s) => s.byFile[file.fileId]?.copied ?? "none",
  );
  const setCopied = useDocumentPreviewStore((s) => s.setCopied);
  const clearActiveFile = usePreviewStore((s) => s.clearActiveFile);
  const expanded = usePreviewStore((s) => s.expanded);
  const setExpanded = usePreviewStore((s) => s.setExpanded);

  const handleClose = () => {
    clearActiveFile();
    onClose?.();
  };

  const ext = getExt(file.name).toLowerCase();
  const isMarkdown = ext === "md" || ext === "markdown";
  const isCsv = ext === "csv";
  const text = state.kind === "text" ? state.text : null;
  const isOfficePdf = isPdfRenderableOffice(officeKind(file.name));

  const highlighted = useMemo(() => {
    if (!text || file.preview !== "code" || isMarkdown) return null;
    return highlightCode(text, ext);
  }, [text, ext, file.preview, isMarkdown]);

  const unavailable =
    state.kind === "error" &&
    (state.reason === "expired" || state.reason === "missing");

  const downloadUrl = `${import.meta.env.VITE_API_BASE_URL || ""}/api/files/${file.fileId}/download`;

  async function handleCopy() {
    if (text === null) return;
    const ok = await copyToClipboard(text);
    if (!ok) return;
    const partial = isCsv && state.kind === "text" && state.truncated;
    setCopied(file.fileId, partial ? "partial" : "full");
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line px-4">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-medium">
            {file.name}
            {ext && <span className="text-muted"> · {ext}</span>}
          </span>
          {file.version > 1 && (
            <span className="shrink-0 rounded-full bg-accent/20 px-2 py-0.5 text-xs text-accent">
              v{file.version}
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {text !== null && text.length > 0 && (
            <button
              type="button"
              onClick={handleCopy}
              aria-label={t(
                copied === "partial"
                  ? "preview.copiedPartial"
                  : copied === "full"
                    ? "common.copied"
                    : "common.copy",
                {
                  defaultValue:
                    copied === "partial"
                      ? "Copied partial"
                      : copied === "full"
                        ? "Copied"
                        : "Copy",
                },
              )}
              className="rounded-md p-2 text-muted hover:bg-surface2">
              {copied !== "none" ? <Check size={16} /> : <Copy size={16} />}
            </button>
          )}

          {!unavailable && (
            <a
              onClick={(event) => {
                if (!file.localFile) return;
                event.preventDefault();

                const url = URL.createObjectURL(file.localFile);
                const link = document.createElement("a");
                link.href = url;
                link.download = file.name;
                link.click();
                window.setTimeout(() => URL.revokeObjectURL(url), 1000);
              }}
              href={file.localFile ? "#" : downloadUrl}
              download
              aria-label={t("common.download")}
              className="rounded-md p-2 text-muted hover:bg-surface2">
              <Download size={16} />
            </a>
          )}

          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            aria-label={t(expanded ? "preview.restore" : "preview.expand", {
              defaultValue: expanded ? "Restore" : "Expand",
            })}
            aria-pressed={expanded}
            className="hidden rounded-md p-2 text-muted hover:bg-surface2 md:inline-flex">
            {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>

          <button
            type="button"
            onClick={handleClose}
            aria-label={t("common.close")}
            className="rounded-md p-2 text-muted hover:bg-surface2">
            <X size={16} />
          </button>
        </div>
      </header>

      {isOfficePdf ? (
        <div className="min-h-0 flex-1">
          <OfficePdfViewer file={file} />
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto bg-bg p-4">
          {state.kind === "loading" && <Skeleton className="h-56 w-full" />}

        {state.kind === "error" && (
          <p role="status" className="text-sm text-muted">
            {t(ERROR_KEYS[state.reason])}
          </p>
        )}

        {state.kind === "office" && (
          <OfficeContent
            key={file.fileId}
            fileId={file.fileId}
            data={state.data}
          />
        )}

        {state.kind === "none" && (
          <div className="flex flex-col items-center justify-center h-full min-h-64 p-6 text-center">
            <div className="p-4 rounded-2xl bg-surface2 text-muted mb-3">
              <FileText className="w-10 h-10" />
            </div>
            <h3 className="text-sm font-semibold text-ink mb-1">{file.name}</h3>
            <p className="text-xs text-muted max-w-sm mb-4 leading-relaxed">
              {t("preview.noPreview", {
                defaultValue:
                  "Pratinjau langsung tidak tersedia untuk tipe file ini.",
              })}
            </p>
            <a
              href={downloadUrl}
              download
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-accent text-accent-fg rounded-xl hover:bg-accent-hover transition-colors">
              <Download className="w-4 h-4" />
              {t("common.download", { defaultValue: "Unduh File" })}
            </a>
          </div>
        )}

        {state.kind === "blob" && file.preview === "image" && (
          <img
            src={state.url}
            alt={file.name}
            className="max-w-full rounded-lg"
          />
        )}

        {state.kind === "blob" && file.preview === "pdf" && (
          <iframe
            src={state.url}
            title={file.name}
            className="h-full min-h-96 w-full rounded-lg border border-line"
          />
        )}

        {state.kind === "text" && isCsv && (
          <CsvContent
            file={file}
            text={state.text}
            truncated={state.truncated}
          />
        )}

        {state.kind === "text" && !isCsv && (
          <>
            {state.truncated && (
              <p className="mb-3 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-muted">
                {t("preview.partial")}
              </p>
            )}

            {state.text.length === 0 ? (
              <p className="text-sm text-muted">{t("preview.empty")}</p>
            ) : (
              <>
                {isMarkdown && (
                  <div className="mb-4 inline-flex gap-1 rounded-lg bg-surface2 p-1">
                    {[
                      { raw: false, label: "preview.tabPreview" },
                      { raw: true, label: "preview.tabCode" },
                    ].map((tab) => (
                      <button
                        key={tab.label}
                        type="button"
                        aria-pressed={showRaw === tab.raw}
                        onClick={() => setShowRaw(tab.raw)}
                        className={`rounded-md px-3 py-1 text-xs ${
                          showRaw === tab.raw
                            ? "bg-surface text-ink"
                            : "text-muted"
                        }`}>
                        {t(tab.label)}
                      </button>
                    ))}
                  </div>
                )}

                {isMarkdown && !showRaw ? (
                  <Markdown>{state.text}</Markdown>
                ) : highlighted !== null ? (
                  <pre className="overflow-x-auto whitespace-pre font-mono text-[13px]">
                    <code dangerouslySetInnerHTML={{ __html: highlighted }} />
                  </pre>
                ) : (
                  <pre className="whitespace-pre-wrap wrap-break-word font-mono text-[13px]">
                    {state.text}
                  </pre>
                )}
              </>
            )}
          </>
        )}
        </div>
      )}
    </div>
  );
}
