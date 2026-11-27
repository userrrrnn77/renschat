import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Code2, Eye, Info } from "lucide-react";
import type { FileBlock } from "../../types";
import { parseCsv } from "../../lib/csv";
import { useDocumentPreviewStore } from "../../store/useDocumentPreviewStore";

interface Props {
  file: FileBlock;
  text: string;
  truncated: boolean;
}

export function CsvContent({ file, text, truncated }: Props) {
  const { t } = useTranslation();
  const mode = useDocumentPreviewStore(
    (s) => s.byFile[file.fileId]?.csvMode ?? "table",
  );
  const setCsvMode = useDocumentPreviewStore((s) => s.setCsvMode);
  const rows = useMemo(() => parseCsv(text), [text]);
  const maxCol = Math.max(
    1,
    rows.reduce((n, row) => Math.max(n, row.length), 0),
  );
  const header = rows[0] ?? [];
  const body = rows.slice(1);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-lg bg-surface2 p-1">
          <button
            type="button"
            aria-pressed={mode === "table"}
            onClick={() => setCsvMode(file.fileId, "table")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              mode === "table" ? "bg-surface text-ink" : "text-muted"
            }`}>
            <Eye className="h-3.5 w-3.5" />
            {t("preview.tabPreview", { defaultValue: "Tabel" })}
          </button>
          <button
            type="button"
            aria-pressed={mode === "source"}
            onClick={() => setCsvMode(file.fileId, "source")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              mode === "source" ? "bg-surface text-ink" : "text-muted"
            }`}>
            <Code2 className="h-3.5 w-3.5" />
            {t("preview.tabCode", { defaultValue: "Kode" })}
          </button>
        </div>
      </div>

      {truncated && (
        <div className="flex items-center gap-2 rounded-xl border border-warning/20 bg-warning/10 p-3 text-xs text-warning">
          <Info className="h-4 w-4 shrink-0" />
          <span>{t("preview.partial")}</span>
        </div>
      )}

      {text.length === 0 ? (
        <p className="text-sm text-muted">{t("preview.empty")}</p>
      ) : mode === "table" ? (
        <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-line bg-surface">
          <table className="w-full border-collapse text-xs">
            <thead className="sticky top-0 z-10 bg-surface2 text-muted">
              <tr>
                <th className="w-10 border-b border-r border-line px-2 py-2 text-center font-semibold">
                  #
                </th>
                {Array.from({ length: maxCol }, (_, index) => (
                  <th
                    key={index}
                    className="min-w-28 border-b border-r border-line px-3 py-2 text-left font-semibold">
                    {header[index] ?? ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {body.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-surface2/50">
                  <td className="border-r border-line bg-surface2/30 px-2 py-1.5 text-center font-mono text-[11px] text-muted">
                    {rowIndex + 2}
                  </td>
                  {Array.from({ length: maxCol }, (_, colIndex) => (
                    <td
                      key={colIndex}
                      className="whitespace-pre-wrap border-r border-line px-3 py-1.5 align-top text-ink">
                      {row[colIndex] ?? "\u00a0"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <pre className="min-h-0 flex-1 overflow-auto rounded-xl border border-line bg-surface p-0 font-mono text-[13px] text-ink">
          {text.split(/\r\n|\n|\r/).map((line, index) => (
            <div key={index} className="flex min-w-0">
              <span className="w-12 shrink-0 select-none border-r border-line bg-surface2/50 px-2 py-0.5 text-right text-[11px] text-muted">
                {index + 1}
              </span>
              <span className="whitespace-pre-wrap break-all px-3 py-0.5">
                {line || "\u00a0"}
              </span>
            </div>
          ))}
        </pre>
      )}
    </div>
  );
}
