import { useMemo, useState } from "react";
import { Check, Copy, Download, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { FileBlock } from "../../types";
import { useFilePreview } from "../../hooks/useFilePreview";
import { copyToClipboard } from "../../lib/copy";
import { getExt } from "../../lib/files";
import { highlightCode } from "../../lib/highlight";
import { Markdown } from "../ui/Markdown";
import { Skeleton } from "../ui/Skeleton";

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
  const [copied, setCopied] = useState(false);

  const ext = getExt(file.name).toLowerCase();
  const isMarkdown = ext === "md" || ext === "markdown";
  const text = state.kind === "text" ? state.text : null;

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
    setCopied(await copyToClipboard(text));
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line px-4">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-medium">{file.name}</span>
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
              aria-label={t(copied ? "common.copied" : "common.copy")}
              className="rounded-md p-2 text-muted hover:bg-surface2">
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          )}

          {!unavailable && (
            <a
              href={downloadUrl}
              download
              aria-label={t("common.download")}
              className="rounded-md p-2 text-muted hover:bg-surface2">
              <Download size={16} />
            </a>
          )}

          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="rounded-md p-2 text-muted hover:bg-surface2">
            <X size={16} />
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto bg-bg p-4">
        {state.kind === "loading" && <Skeleton className="h-56 w-full" />}

        {state.kind === "error" && (
          <p role="status" className="text-sm text-muted">
            {t(ERROR_KEYS[state.reason])}
          </p>
        )}

        {state.kind === "none" && (
          <p className="text-sm text-muted">{t("preview.noPreview")}</p>
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

        {state.kind === "text" && (
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
    </div>
  );
}
