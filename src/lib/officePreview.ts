import JSZip from "jszip";

export interface OfficeCell {
  address: string;
  row: number;
  col: number;
  value: string;
  formula?: string;
  cacheMissing?: boolean;
  emphasis?: "header" | "total";
}

export interface OfficeRow {
  index: number;
  cells: OfficeCell[];
}

export interface OfficePart {
  title: string;
  lines: string[];
  rows?: OfficeRow[];
  limited?: boolean;
  maxCol?: number;
}

export type OfficePreview = {
  kind: "docx" | "xlsx" | "pptx";
  parts: OfficePart[];
};

// Interface tambahan untuk mengenali API stream internal JSZip
interface StreamHelper {
  on(event: "data", cb: (bytes: Uint8Array) => void): StreamHelper;
  on(event: "error", cb: (err: unknown) => void): StreamHelper;
  on(event: "end", cb: () => void): StreamHelper;
  pause(): void;
  resume(): void;
}

interface CustomJSZipObject extends JSZip.JSZipObject {
  internalStream(type: string): StreamHelper;
}

const elements = (root: Document | Element, name: string) =>
  Array.from(root.getElementsByTagNameNS("*", name));

const textRuns = (root: Element) =>
  elements(root, "t")
    .map((t) => t.textContent ?? "")
    .join("");

const columnName = (index: number): string =>
  (index > 26 ? columnName(Math.floor((index - 1) / 26)) : "") +
  String.fromCharCode(65 + ((index - 1) % 26));

interface CellStyle {
  numFmt: string;
  bold: boolean;
}

const BUILTIN_NUM_FMTS = new Map<number, string>([
  [0, "General"],
  [1, "0"],
  [2, "0.00"],
  [3, "#,##0"],
  [4, "#,##0.00"],
  [9, "0%"],
  [10, "0.00%"],
  [14, "m/d/yy"],
  [22, "m/d/yy h:mm"],
]);

function formatNumber(raw: string, format: string): string {
  if (!raw) return "";
  if (!format || format === "General") return raw;
  const number = Number(raw);
  if (!Number.isFinite(number)) return raw;
  if (format.includes("%")) {
    const decimals = /0\.(0+)%/.exec(format)?.[1].length ?? 0;
    return `${(number * 100).toFixed(decimals)}%`;
  }
  if (/[ymd]/i.test(format)) {
    const date = new Date(Date.UTC(1899, 11, 30) + number * 86400000);
    if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);
  }
  if (format.includes("0.00")) return number.toFixed(2);
  if (format.includes("#,##0")) return number.toLocaleString("en-US");
  return raw;
}

async function readStyles(
  zip: JSZip,
  xml: (path: string) => Promise<Document>,
): Promise<CellStyle[]> {
  if (!zip.file("xl/styles.xml")) return [];
  const stylesDoc = await xml("xl/styles.xml");
  const numFmts = new Map<number, string>();
  for (const item of elements(stylesDoc, "numFmt")) {
    const id = Number(item.getAttribute("numFmtId"));
    if (Number.isFinite(id)) {
      numFmts.set(id, item.getAttribute("formatCode") ?? "");
    }
  }
  const fonts = elements(stylesDoc, "font").map(
    (font) => elements(font, "b").length > 0,
  );
  const cellXfs = elements(stylesDoc, "cellXfs")[0];
  if (!cellXfs) return [];
  const styles: CellStyle[] = [];
  for (const xf of elements(cellXfs, "xf")) {
    const fontId = Number(xf.getAttribute("fontId") ?? 0);
    const numFmtId = Number(xf.getAttribute("numFmtId") ?? 0);
    styles.push({
      bold: fonts[fontId] === true,
      numFmt:
        numFmts.get(numFmtId) ??
        BUILTIN_NUM_FMTS.get(numFmtId) ??
        "General",
    });
  }
  return styles;
}

export async function parseOffice(
  file: Blob,
  kind: OfficePreview["kind"],
): Promise<OfficePreview> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  let budget = 48 * 1024 * 1024;

  async function xml(path: string) {
    // Cast tipe objek file JSZip ke CustomJSZipObject
    const part = zip.file(path) as CustomJSZipObject | null;
    if (!part) throw new Error("Missing Office part");

    const source = await new Promise<string>((resolve, reject) => {
      const stream = part.internalStream("uint8array");
      const decoder = new TextDecoder();
      const chunks: string[] = [];
      let size = 0;

      stream
        .on("data", (bytes: Uint8Array) => {
          size += bytes.length;
          budget -= bytes.length;
          if (size > 16 * 1024 * 1024 || budget < 0) {
            stream.pause();
            reject(new Error("Preview size limit"));
            return;
          }
          chunks.push(decoder.decode(bytes, { stream: true }));
        })
        .on("error", reject)
        .on("end", () => resolve(chunks.join("") + decoder.decode()))
        .resume();
    });

    if (/<!DOCTYPE/i.test(source)) throw new Error("Unsupported XML");
    const doc = new DOMParser().parseFromString(source, "application/xml");
    if (elements(doc, "parsererror").length) throw new Error("Invalid XML");
    return doc;
  }

  if (kind === "docx") {
    const doc = await xml("word/document.xml");
    return {
      kind,
      parts: [
        { title: "", lines: elements(doc, "p").map(textRuns).filter(Boolean) },
      ],
    };
  }

  const book = kind === "xlsx";
  const main = book ? "xl/workbook.xml" : "ppt/presentation.xml";
  const dir = main.split("/")[0];
  const rels = await xml(dir + "/_rels/" + main.split("/")[1] + ".rels");
  const paths = new Map<string, string>();

  for (const r of elements(rels, "Relationship")) {
    if (r.getAttribute("TargetMode") === "External") continue;
    const path = new URL(
      r.getAttribute("Target") ?? "",
      "https://package.invalid/" + main,
    );
    if (path.origin === "https://package.invalid")
      paths.set(
        r.getAttribute("Id") ?? "",
        decodeURIComponent(path.pathname.slice(1)),
      );
  }

  const manifest = await xml(main);
  const strings =
    book && zip.file("xl/sharedStrings.xml")
      ? elements(await xml("xl/sharedStrings.xml"), "si").map(textRuns)
      : [];
  const styles = book ? await readStyles(zip, xml) : [];
  const parts: OfficePart[] = [];

  for (const entry of elements(manifest, book ? "sheet" : "sldId")) {
    const id = Array.from(entry.attributes).find(
      (a) => a.localName === "id" && a.namespaceURI,
    )?.value;
    const path = paths.get(id ?? "");
    if (!path) throw new Error("Missing Office relationship");
    const doc = await xml(path);

    if (!book) {
      parts.push({
        title: String(parts.length + 1),
        lines: elements(doc, "p").map(textRuns).filter(Boolean),
      });
      continue;
    }

    const rows: OfficeRow[] = [];
    let limited = false;
    let maxCol = 0;

    for (const row of elements(doc, "row")) {
      if (rows.length === 2000) {
        limited = true;
        break;
      }
      const rowIndex = Number(row.getAttribute("r") ?? rows.length + 1);
      const cells: OfficeCell[] = [];
      for (const cell of elements(row, "c")) {
        const address = cell.getAttribute("r") ?? "";
        const letters = /^[A-Z]+/.exec(address)?.[0];
        const col = letters
          ? [...letters].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0)
          : cells.length + 1;
        if (col > 64) {
          limited = true;
          continue;
        }
        maxCol = Math.max(maxCol, col);
        const style = styles[Number(cell.getAttribute("s") ?? 0)];
        const type = cell.getAttribute("t");
        const raw = elements(cell, "v")[0]?.textContent ?? "";
        const formula = elements(cell, "f")[0]?.textContent ?? undefined;
        const shared =
          type === "s"
            ? (strings[Number(raw)] ?? "")
            : type === "inlineStr"
              ? textRuns(cell)
              : raw;
        const value = formula
          ? raw
            ? formatNumber(raw, style?.numFmt ?? "General")
            : ""
          : formatNumber(shared, style?.numFmt ?? "General");
        const emphasis: OfficeCell["emphasis"] = style?.bold
          ? rowIndex === 1
            ? "header"
            : formula?.toUpperCase().includes("SUM")
              ? "total"
              : undefined
          : undefined;
        cells.push({
          address: address || `${columnName(col)}${rowIndex}`,
          row: rowIndex,
          col,
          value,
          formula,
          cacheMissing: Boolean(formula && !raw),
          emphasis,
        });
      }
      rows.push({ index: rowIndex, cells });
    }
    parts.push({
      title: entry.getAttribute("name") ?? "",
      lines: [],
      rows,
      limited,
      maxCol,
    });
  }

  return { kind, parts };
}
