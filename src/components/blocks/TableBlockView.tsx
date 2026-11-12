import { useState } from "react";
import { copyToClipboard } from "../../lib/copy";
import type { TableBlock } from "../../types";

export function TableBlockView({ block }: { block: TableBlock }) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc" | null>(null);

  const handleSort = (key: string) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("asc");
    } else if (sortDir === "asc") setSortDir("desc");
    else {
      setSortKey(null);
      setSortDir(null);
    }
  };

  const sortedRows = [...(block.rows || [])].sort((a, b) => {
    if (!sortKey || !sortDir) return 0;
    const va = a[sortKey];
    const vb = b[sortKey];
    if (va === vb) return 0;
    if (va === null) return 1;
    if (vb === null) return -1;
    const res = va > vb ? 1 : -1;
    return sortDir === "asc" ? res : -res;
  });

  const copyTSV = () => {
    const header = block.columns.map((c) => c.label).join("\t");
    const rows = sortedRows
      .map((r) => block.columns.map((c) => r[c.key] ?? "").join("\t"))
      .join("\n");
    copyToClipboard(`${header}\n${rows}`);
  };

  const downloadCSV = () => {
    const header = block.columns.map((c) => `"${c.label}"`).join(",");
    const rows = sortedRows
      .map((r) => block.columns.map((c) => `"${r[c.key] ?? ""}"`).join(","))
      .join("\n");
    const blob = new Blob([`${header}\n${rows}`], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "table.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="my-4">
      {block.title && (
        <h4 className="text-sm font-semibold mb-2">{block.title}</h4>
      )}
      <div className="overflow-x-auto border border-line rounded-xl">
        <table className="w-full text-sm text-left">
          <thead className="bg-surface2 text-muted">
            <tr>
              {block.columns.map((c) => (
                <th
                  key={c.key}
                  onClick={() => handleSort(c.key)}
                  className={`px-4 py-3 font-medium cursor-pointer hover:text-ink select-none ${c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : ""}`}>
                  {c.label}{" "}
                  {sortKey === c.key && (sortDir === "asc" ? "↑" : "↓")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line/50">
            {sortedRows.map((row, i) => (
              <tr key={i} className="hover:bg-surface2/50 transition-colors">
                {block.columns.map((c) => {
                  const val = row[c.key];
                  return (
                    <td
                      key={c.key}
                      className={`px-4 py-3 ${c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : ""}`}>
                      {val === null
                        ? "—"
                        : typeof val === "boolean"
                          ? val
                            ? "✓"
                            : "✗"
                          : String(val)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between items-center mt-2 text-xs text-muted">
        <span>{sortedRows.length} baris</span>
        <div className="flex gap-2">
          <button
            onClick={copyTSV}
            className="hover:text-ink transition-colors">
            Salin (TSV)
          </button>
          <button
            onClick={downloadCSV}
            className="hover:text-ink transition-colors">
            Unduh CSV
          </button>
        </div>
      </div>
    </div>
  );
}
