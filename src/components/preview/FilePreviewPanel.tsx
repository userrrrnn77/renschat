import { useEffect, useState } from "react";
import { useUIStore } from "../../store/uiStore";
import { useAuthedBlobUrl } from "../../hooks/useAuthedBlobUrl";
import { getExt } from "../../lib/files";
import { X, Download, Copy, Check } from "lucide-react";
import { copyToClipboard } from "../../lib/copy";
import { Skeleton } from "../ui/Skeleton";
import { highlightCode } from "../../lib/highlight";
import { Markdown } from "../ui/Markdown";

export function FilePreviewPanel() {
  const { preview, closePreview } = useUIStore();
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  const { url, loading: loadingBlob } = useAuthedBlobUrl(preview?.fileId || "");

  useEffect(() => {
    if (!preview) return;
    if (preview.preview === "text" || preview.preview === "code") {
      setLoadingText(true);
      fetch(
        `${import.meta.env.VITE_API_BASE_URL || ""}/api/files/${preview.fileId}/content`,
        { credentials: "include" },
      )
        .then(async (res) => {
          if (!res.ok) {
            if (res.status === 415) {
              setTextContent(
                "File ini bertipe biner dan tidak bisa ditampilkan sebagai teks.",
              );
              return;
            }
            throw new Error("fetch failed");
          }
          const data = await res.json();
          if (data.text) setTextContent(data.text);
        })
        .catch((err) => {
          console.error(err);
          setTextContent("Gagal memuat teks file.");
        })
        .finally(() => setLoadingText(false));
    }
  }, [preview]);

  if (!preview) return null;

  const handleCopy = () => {
    if (textContent) {
      copyToClipboard(textContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface border-l border-line animate-in slide-in-from-right-8">
      <div className="h-14 flex items-center justify-between px-4 border-b border-line shrink-0">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="font-medium text-sm truncate">{preview.name}</span>
          {preview.version > 1 && (
            <span className="text-[10px] bg-accent/20 text-accent px-1.5 py-0.5 rounded-full font-semibold shrink-0">
              v{preview.version}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {(preview.preview === "text" || preview.preview === "code") && (
            <button
              onClick={handleCopy}
              className="p-1.5 text-muted hover:text-ink rounded-md transition-colors">
              {copied ? (
                <Check className="w-4 h-4 text-success" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          )}
          <a
            href={`${import.meta.env.VITE_API_BASE_URL || ""}/api/files/${preview.fileId}/download`}
            download
            className="p-1.5 text-muted hover:text-ink rounded-md transition-colors">
            <Download className="w-4 h-4" />
          </a>
          <button
            onClick={closePreview}
            className="p-1.5 text-muted hover:text-ink rounded-md transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 bg-bg">
        {preview.preview === "image" &&
          (loadingBlob ? (
            <Skeleton className="w-full h-64" />
          ) : url ? (
            <img src={url} className="max-w-full rounded-lg" />
          ) : (
            <div className="text-danger">Gagal memuat gambar</div>
          ))}

        {preview.preview === "pdf" &&
          (loadingBlob ? (
            <Skeleton className="w-full h-full" />
          ) : url ? (
            <iframe
              src={url}
              className="w-full h-full min-h-125 rounded-lg border border-line"
            />
          ) : (
            <div className="text-danger">Gagal memuat PDF</div>
          ))}

        {(preview.preview === "text" || preview.preview === "code") &&
          (loadingText ? (
            <Skeleton className="w-full h-64" />
          ) : textContent ? (
            <div className="h-full flex flex-col">
              {getExt(preview.name) === "md" && (
                <div className="flex gap-2 mb-4 bg-surface2 p-1 rounded-lg w-fit">
                  <button
                    onClick={() => setShowRaw(false)}
                    className={`px-3 py-1 text-xs rounded-md ${!showRaw ? "bg-surface shadow-sm" : "text-muted"}`}>
                    Pratinjau
                  </button>
                  <button
                    onClick={() => setShowRaw(true)}
                    className={`px-3 py-1 text-xs rounded-md ${showRaw ? "bg-surface shadow-sm" : "text-muted"}`}>
                    Kode
                  </button>
                </div>
              )}
              {!showRaw && getExt(preview.name) === "md" ? (
                <Markdown>{textContent}</Markdown>
              ) : (
                <pre
                  className="text-[13px] font-mono whitespace-pre-wrap flex-1"
                  dangerouslySetInnerHTML={{
                    __html: highlightCode(textContent, getExt(preview.name)),
                  }}
                />
              )}
            </div>
          ) : (
            <div className="text-muted">Gagal memuat teks</div>
          ))}

        {preview.preview === "none" && (
          <div className="flex flex-col items-center justify-center h-full text-muted gap-4">
            <div className="w-20 h-20 bg-surface2 rounded-xl flex items-center justify-center text-3xl font-bold uppercase">
              {getExt(preview.name)}
            </div>
            <p>Pratinjau tidak tersedia untuk tipe file ini.</p>
          </div>
        )}
      </div>
    </div>
  );
}
