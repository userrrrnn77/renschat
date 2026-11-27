// src/components/preview/PdfViewer.tsx
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Maximize2, ZoomIn, ZoomOut, Loader2 } from "lucide-react";
import { pdfjs } from "../../lib/pdfjs";
import type { PDFDocumentProxy } from "../../lib/pdfjs";

type BadgeStyle = "page" | "slide";

interface PdfPageProps {
  doc: PDFDocumentProxy;
  pageNumber: number;
  total: number;
  scale: number;
  badge: BadgeStyle;
}

function PdfPage({ doc, pageNumber, total, scale, badge }: PdfPageProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [intrinsic, setIntrinsic] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const renderTaskRef = useRef<{
    cancel(): void;
    promise: Promise<void>;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    doc.getPage(pageNumber).then((page) => {
      if (cancelled) return;
      const vp = page.getViewport({ scale: 1 });
      setIntrinsic({ width: vp.width, height: vp.height });
    });
    return () => {
      cancelled = true;
    };
  }, [doc, pageNumber]);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) setVisible(entry.isIntersecting);
      },
      { rootMargin: "300px 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || !intrinsic) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    renderTaskRef.current?.cancel();
    renderTaskRef.current = null;

    (async () => {
      try {
        const page = await doc.getPage(pageNumber);
        if (cancelled) return;

        const dpr = window.devicePixelRatio || 1;
        const viewport = page.getViewport({ scale: scale * dpr });
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${viewport.width / dpr}px`;
        canvas.style.height = `${viewport.height / dpr}px`;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const task = page.render({ canvasContext: ctx, viewport });
        renderTaskRef.current = task;
        await task.promise;
        if (renderTaskRef.current === task) renderTaskRef.current = null;
      } catch (err) {
        const name = (err as { name?: string } | null)?.name;
        if (name === "RenderingCancelledException") return;
        if (!cancelled) {
          // eslint-disable-next-line no-console
          console.warn("PDF page render failed", { pageNumber, err });
        }
      }
    })();

    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
    };
  }, [doc, pageNumber, scale, visible, intrinsic]);

  const width = (intrinsic?.width ?? 612) * scale;
  const height = (intrinsic?.height ?? 792) * scale;

  const badgeLabel =
    badge === "slide"
      ? t("preview.slideBadge", {
          current: pageNumber,
          total,
          defaultValue: `Slide ${pageNumber} / ${total}`,
        })
      : t("preview.pageBadge", {
          current: pageNumber,
          total,
          defaultValue: `Page ${pageNumber} / ${total}`,
        });

  return (
    <div
      ref={wrapperRef}
      data-page={pageNumber}
      className="relative shrink-0 bg-white shadow-[0_18px_40px_-18px_rgba(0,0,0,0.7)]"
      style={{ width, height }}>
      <canvas ref={canvasRef} className="block" />
      <span className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-medium text-white">
        {badgeLabel}
      </span>
    </div>
  );
}

interface PdfViewerProps {
  url: string;
  filename: string;
  badge?: BadgeStyle;
}

export function PdfViewer({ url, filename, badge = "page" }: PdfViewerProps) {
  const { t } = useTranslation();
  const stageRef = useRef<HTMLDivElement>(null);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [maxPageWidth, setMaxPageWidth] = useState(612);
  const [zoomMode, setZoomMode] = useState<"fit" | "custom">("fit");
  const [customZoom, setCustomZoom] = useState(1);
  const [fitZoom, setFitZoom] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDoc(null);
    setPageCount(0);

    const task = pdfjs.getDocument({ url });

    task.promise
      .then(async (pdfDoc) => {
        if (cancelled) {
          void pdfDoc.destroy();
          return;
        }

        let widest = 0;
        for (let i = 1; i <= pdfDoc.numPages; i += 1) {
          const page = await pdfDoc.getPage(i);
          const vp = page.getViewport({ scale: 1 });
          if (vp.width > widest) widest = vp.width;
        }
        if (cancelled) {
          void pdfDoc.destroy();
          return;
        }

        setDoc(pdfDoc);
        setPageCount(pdfDoc.numPages);
        setMaxPageWidth(widest || 612);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(String((err as Error)?.message ?? err));
        setLoading(false);
      });

    return () => {
      cancelled = true;
      void task.destroy().catch(() => {});
    };
  }, [url]);

  // Fit-width mengikuti lebar stage (dock) tanpa refetch.
  useEffect(() => {
    const el = stageRef.current;
    if (!el || !maxPageWidth) return;
    const update = () => {
      const available = el.clientWidth - 64;
      if (available > 40) {
        setFitZoom(Math.max(0.1, Math.min(4, available / maxPageWidth)));
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [maxPageWidth]);

  const scale = zoomMode === "fit" ? fitZoom : customZoom;
  const scalePct = Math.round(scale * 100);

  const setZoomPct = (pct: number) => {
    const clamped = Math.max(10, Math.min(400, pct));
    setCustomZoom(clamped / 100);
    setZoomMode("custom");
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-1 border-b border-line bg-surface px-2 py-1 text-xs text-muted">
        <button
          type="button"
          onClick={() => setZoomMode("fit")}
          aria-pressed={zoomMode === "fit"}
          title={t("preview.fitWidth", { defaultValue: "Fit width" })}
          className={`inline-flex items-center gap-1 rounded-md px-2 py-1 transition-colors ${
            zoomMode === "fit" ? "bg-surface2 text-ink" : "hover:bg-surface2"
          }`}>
          <Maximize2 className="h-3.5 w-3.5" />
          <span>{t("preview.fitWidth", { defaultValue: "Fit width" })}</span>
        </button>

        <button
          type="button"
          onClick={() => setZoomPct(scalePct - 10)}
          aria-label={t("preview.zoomOut", { defaultValue: "Zoom out" })}
          className="rounded-md p-1 hover:bg-surface2">
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        <span className="w-12 text-center tabular-nums text-ink">
          {scalePct}%
        </span>
        <button
          type="button"
          onClick={() => setZoomPct(scalePct + 10)}
          aria-label={t("preview.zoomIn", { defaultValue: "Zoom in" })}
          className="rounded-md p-1 hover:bg-surface2">
          <ZoomIn className="h-3.5 w-3.5" />
        </button>

        <span className="ml-auto truncate text-[11px]">{filename}</span>
      </div>

      <div
        ref={stageRef}
        className="min-h-0 flex-1 overflow-auto bg-neutral-900 px-6 py-6">
        {loading && (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-neutral-300">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>
              {t("preview.loading", { defaultValue: "Loading preview…" })}
            </span>
          </div>
        )}

        {error && !loading && (
          <p className="mx-auto max-w-md rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {t("preview.loadError", {
              defaultValue: "Failed to load preview.",
            })}
          </p>
        )}

        {doc && !loading && (
          <div className="mx-auto flex w-fit flex-col items-center gap-6">
            {Array.from({ length: pageCount }, (_, i) => (
              <PdfPage
                key={`${url}:${i + 1}`}
                doc={doc}
                pageNumber={i + 1}
                total={pageCount}
                scale={scale}
                badge={badge}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
