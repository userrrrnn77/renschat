import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { OfficePreview } from "../../lib/officePreview";
import { useDocumentPreviewStore } from "../../store/useDocumentPreviewStore";
import {
  FileText,
  Table,
  Presentation,
  ChevronLeft,
  ChevronRight,
  Info,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

export function OfficeContent({
  data,
  fileId,
}: {
  data: OfficePreview;
  fileId: string;
}) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const [page, setPage] = useState(0);
  const sheetIndex = useDocumentPreviewStore(
    (s) => s.byFile[fileId]?.sheetIndex ?? 0,
  );
  const setSheetIndex = useDocumentPreviewStore((s) => s.setSheetIndex);
  const zoom = useDocumentPreviewStore((s) => s.byFile[fileId]?.zoom ?? 100);
  const setZoom = useDocumentPreviewStore((s) => s.setZoom);
  const selection = useDocumentPreviewStore(
    (s) => s.byFile[fileId]?.selection ?? "A1",
  );
  const setSelection = useDocumentPreviewStore((s) => s.setSelection);

  const activeIndex =
    data.kind === "xlsx"
      ? Math.min(sheetIndex, Math.max(0, data.parts.length - 1))
      : index;
  const part = data.parts[activeIndex];

  if (!part) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-muted">
        <FileText className="w-10 h-10 mb-2 opacity-50" />
        <p className="text-sm">{t("preview.empty")}</p>
      </div>
    );
  }

  function column(i: number): string {
    return (
      (i >= 26 ? column(Math.floor(i / 26) - 1) : "") +
      String.fromCharCode(65 + (i % 26))
    );
  }

  // Tampilan Microsoft Word (.docx)
  if (data.kind === "docx") {
    return (
      <div className="flex flex-col gap-4 max-w-3xl mx-auto py-2">
        <div className="flex items-center gap-2 text-xs text-muted font-medium pb-2 border-b border-line">
          <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-500">
            <FileText className="w-4 h-4" />
          </div>
          <span>{t("preview.wordDocument")}</span>
        </div>

        {part.limited && (
          <div className="flex items-center gap-2 p-3 text-xs bg-warning/10 text-warning border border-warning/20 rounded-xl">
            <Info className="w-4 h-4 shrink-0" />
            <span>{t("preview.partial")}</span>
          </div>
        )}

        <article className="space-y-4 rounded-2xl border border-line bg-surface p-6 md:p-8 shadow-sm">
          {part.lines.length > 0 ? (
            part.lines.map((line, i) => (
              <p
                key={i}
                className="whitespace-pre-wrap wrap-break-word leading-relaxed text-sm text-ink">
                {line}
              </p>
            ))
          ) : (
            <p className="text-sm text-muted italic">
              {t("preview.wordEmpty")}
            </p>
          )}
        </article>
      </div>
    );
  }

  // Tampilan Microsoft PowerPoint (.pptx)
  if (data.kind === "pptx") {
    return (
      <div className="flex flex-col gap-4 max-w-3xl mx-auto py-2">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-line">
          <div className="flex items-center gap-2 text-xs text-muted font-medium">
            <div className="p-1.5 rounded-md bg-orange-500/10 text-orange-500">
              <Presentation className="w-4 h-4" />
            </div>
            <span>{t("preview.powerpointPresentation")}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              className="p-1.5 rounded-lg border border-line bg-surface hover:bg-surface2 disabled:opacity-40 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>

            <select
              aria-label={t("preview.selectSlide")}
              className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs text-ink font-medium focus:outline-none focus:border-accent"
              value={index}
              onChange={(e) => setIndex(Number(e.target.value))}>
              {data.parts.map((p, i) => (
                <option key={i} value={i}>
                  {t("preview.slideOption", {
                    current: i + 1,
                    total: data.parts.length,
                    title: p.title ? `(${p.title})` : "",
                  })}
                </option>
              ))}
            </select>

            <button
              type="button"
              disabled={index >= data.parts.length - 1}
              onClick={() =>
                setIndex((i) => Math.min(data.parts.length - 1, i + 1))
              }
              className="p-1.5 rounded-lg border border-line bg-surface hover:bg-surface2 disabled:opacity-40 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {part.limited && (
          <div className="flex items-center gap-2 p-3 text-xs bg-warning/10 text-warning border border-warning/20 rounded-xl">
            <Info className="w-4 h-4 shrink-0" />
            <span>{t("preview.partial")}</span>
          </div>
        )}

        <div className="relative rounded-2xl border border-line bg-surface p-6 md:p-8 shadow-sm min-h-64 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-line/60">
            <span className="text-xs font-semibold text-accent uppercase tracking-wider">
              {t("preview.slideLabel", { current: index + 1 })}
            </span>
            <span className="text-xs text-muted">
              {t("preview.slideCounter", {
                current: index + 1,
                total: data.parts.length,
              })}
            </span>
          </div>

          <div className="space-y-3 flex-1">
            {part.lines.length > 0 ? (
              part.lines.map((line, i) => (
                <p
                  key={i}
                  className="whitespace-pre-wrap wrap-break-word leading-relaxed text-sm text-ink">
                  {line}
                </p>
              ))
            ) : (
              <p className="text-sm text-muted italic">
                {t("preview.slideEmpty")}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Tampilan Microsoft Excel (.xlsx)
  const rows = part.rows ?? [];
  const pageSize = 100;
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const visible = rows.slice(
    safePage * pageSize,
    (safePage + 1) * pageSize,
  );
  const maxCol = Math.max(
    1,
    part.maxCol ??
      rows.reduce(
        (max, row) =>
          Math.max(max, ...row.cells.map((cell) => cell.col)),
        0,
      ),
  );
  const selectedCell = rows
    .flatMap((row) => row.cells)
    .find((cell) => cell.address === selection);
  const selectedAddress = selectedCell?.address ?? selection;
  const formulaText = selectedCell?.formula ?? selectedCell?.value ?? "";

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-line">
        <div className="flex items-center gap-2 text-xs text-muted font-medium">
          <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-500">
            <Table className="w-4 h-4" />
          </div>
          <span>{t("preview.excelWorksheet")}</span>
        </div>

        <div className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2 py-1 text-xs text-muted">
          <button
            type="button"
            aria-label={t("preview.zoomOut", { defaultValue: "Zoom out" })}
            onClick={() => setZoom(fileId, Math.max(50, zoom - 10))}
            className="rounded-md p-1 hover:bg-surface2">
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <span className="w-10 text-center font-mono text-[11px]">{zoom}%</span>
          <button
            type="button"
            aria-label={t("preview.zoomIn", { defaultValue: "Zoom in" })}
            onClick={() => setZoom(fileId, Math.min(200, zoom + 10))}
            className="rounded-md p-1 hover:bg-surface2">
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {part.limited && (
        <div className="flex items-center gap-2 p-3 text-xs bg-warning/10 text-warning border border-warning/20 rounded-xl">
          <Info className="w-4 h-4 shrink-0" />
          <span>{t("preview.partial")}</span>
        </div>
      )}

      <div className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2">
        <span className="w-14 shrink-0 rounded-md bg-surface2 px-2 py-1 text-center font-mono text-[11px] text-muted">
          {selectedAddress}
        </span>
        <span className="shrink-0 text-xs font-semibold text-muted">fx</span>
        <div
          className="min-w-0 flex-1 truncate font-mono text-xs text-ink"
          title={formulaText}>
          {formulaText || t("preview.empty")}
        </div>
      </div>

      {rows.length > 0 ? (
        <>
          <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-slate-200 bg-white">
            <table
              className="border-collapse text-xs text-slate-900"
              style={{ zoom: `${zoom}%` }}>
              <thead className="sticky top-0 z-20 bg-slate-50">
                <tr>
                  <th className="sticky left-0 z-30 w-10 border-b border-r border-slate-200 bg-slate-50 px-2 py-1.5 text-center font-semibold text-slate-500">
                    #
                  </th>
                  {Array.from({ length: maxCol }, (_, index) => (
                    <th
                      key={index}
                      className="min-w-24 border-b border-r border-slate-200 px-3 py-1.5 text-left font-semibold text-slate-500">
                      {column(index)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <tr key={row.index}>
                    <th
                      scope="row"
                      className="sticky left-0 z-10 border-b border-r border-slate-200 bg-slate-50 px-2 py-1.5 text-center font-mono text-[11px] font-normal text-slate-500">
                      {row.index}
                    </th>
                    {Array.from({ length: maxCol }, (_, index) => {
                      const col = index + 1;
                      const cell = row.cells.find((item) => item.col === col);
                      const address =
                        cell?.address ?? `${column(index)}${row.index}`;
                      const active = address === selection;
                      const display =
                        cell?.formula && cell.cacheMissing
                          ? t("preview.excelCacheMissing", {
                              defaultValue: "Cache tidak tersedia",
                            })
                          : cell?.value ?? "";
                      return (
                        <td
                          key={col}
                          onClick={() => setSelection(fileId, address)}
                          className={`cursor-cell whitespace-pre-wrap border-b border-r border-slate-200 px-3 py-1.5 align-top ${
                            active
                              ? "bg-emerald-50 ring-2 ring-inset ring-emerald-500"
                              : cell?.emphasis === "header"
                                ? "bg-slate-100 font-semibold"
                                : cell?.emphasis === "total"
                                  ? "bg-amber-50 font-semibold"
                                  : "bg-white"
                          }`}>
                          {display || "\u00a0"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1 overflow-x-auto">
              {data.parts.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setSheetIndex(fileId, i);
                    setPage(0);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                    activeIndex === i
                      ? "bg-emerald-600 text-white"
                      : "bg-surface2 text-muted hover:text-ink"
                  }`}>
                  {p.title || t("preview.sheetDefaultTitle", { number: i + 1 })}
                </button>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-2 text-xs text-muted">
                <span>
                  {t("preview.paginationInfo", {
                    page: safePage + 1,
                    total: totalPages,
                    rows: rows.length,
                  })}
                </span>
                <button
                  type="button"
                  disabled={safePage === 0}
                  onClick={() => setPage((value) => Math.max(0, value - 1))}
                  className="px-2.5 py-1 rounded-lg border border-line bg-surface hover:bg-surface2 disabled:opacity-40 transition-colors">
                  {t("preview.previous")}
                </button>
                <button
                  type="button"
                  disabled={safePage + 1 >= totalPages}
                  onClick={() =>
                    setPage((value) => Math.min(totalPages - 1, value + 1))
                  }
                  className="px-2.5 py-1 rounded-lg border border-line bg-surface hover:bg-surface2 disabled:opacity-40 transition-colors">
                  {t("preview.next")}
                </button>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="p-8 text-center text-sm text-muted italic">
          {t("preview.excelEmpty")}
        </div>
      )}
    </div>
  );
}
