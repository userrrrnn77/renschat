// src/lib/toolLabels.ts

export type ToolProgressStatus = "running" | "ok" | "error";

type ToolCategory =
  | "image"
  | "video"
  | "search"
  | "file"
  | "ui"
  | "web"
  | "command"
  | "generic";

const CATEGORY_BY_TOOL: Record<string, ToolCategory> = {
  generate_image: "image",
  generate_video_cosmos: "video",
  generate_video_python: "video",
  search_attachment: "search",
  read_attachment: "search",
  inspect_image: "search",
  create_file: "file",
  present_files: "file",
  generate_pdf: "file",
  render_table: "ui",
  render_chart: "ui",
  render_card: "ui",
  render_choices: "ui",
  web_scrape: "web",
  run_command: "command",
};

interface LabelPair {
  running: string;
  error: string;
}

const ID_LABELS: Record<ToolCategory, LabelPair> = {
  image: { running: "Sedang membuat gambar…", error: "Gagal membuat gambar" },
  video: { running: "Sedang membuat video…", error: "Gagal membuat video" },
  search: { running: "Sedang mencari informasi…", error: "Pencarian gagal" },
  file: { running: "Sedang menyiapkan file…", error: "Gagal menyiapkan file" },
  ui: {
    running: "Sedang menyusun tampilan…",
    error: "Gagal menyusun tampilan",
  },
  web: { running: "Sedang membaca halaman…", error: "Gagal membaca halaman" },
  command: { running: "Sedang memproses…", error: "Proses gagal" },
  generic: { running: "Sedang memproses…", error: "Proses gagal" },
};

const EN_LABELS: Record<ToolCategory, LabelPair> = {
  image: { running: "Creating an image…", error: "Failed to create image" },
  video: { running: "Creating a video…", error: "Failed to create video" },
  search: { running: "Looking that up…", error: "Lookup failed" },
  file: { running: "Preparing the file…", error: "Failed to prepare file" },
  ui: { running: "Building the view…", error: "Failed to build view" },
  web: { running: "Reading the page…", error: "Failed to read page" },
  command: { running: "Working on it…", error: "Processing failed" },
  generic: { running: "Working on it…", error: "Processing failed" },
};

/**
 * Label progres generik. Tidak pernah memakai nama tool internal —
 * hanya kategori fungsi. `name` dipakai semata untuk klasifikasi.
 */
export function getToolProgressLabel(
  name: string,
  status: ToolProgressStatus,
  language: string | undefined,
): string {
  const category = CATEGORY_BY_TOOL[name] ?? "generic";
  const table = language?.toLowerCase().startsWith("en")
    ? EN_LABELS
    : ID_LABELS;
  const pair = table[category];
  return status === "error" ? pair.error : pair.running;
}
