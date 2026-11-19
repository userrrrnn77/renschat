// src/components/blocks/FileBlockView.tsx
import { formatBytes } from "../../lib/files";
import {
  Braces,
  Code2,
  Database,
  File,
  FileArchive,
  FileText,
  Gauge,
  Image as ImageIcon,
  Package,
  Pyramid,
  Settings2,
  Terminal,
  type LucideIcon,
} from "lucide-react";
import type { FileBlock } from "../../types";
import { useUIStore } from "../../store/uiStore";
import { useTranslation } from "react-i18next";

const FILE_ICONS = new Map<string, LucideIcon>([
  ["file", File],
  ["package", Package],
  ["gauge", Gauge],
  ["pyramid", Pyramid],
  ["code", Code2],
  ["braces", Braces],
  ["database", Database],
  ["terminal", Terminal],
  ["settings", Settings2],
  ["archive", FileArchive],
  ["image", ImageIcon],
  ["document", FileText],
]);

export function FileBlockView({ block }: { block: FileBlock }) {
  const FileIcon = FILE_ICONS.get(block.appearance?.icon ?? "") ?? File;
  const accent = block.appearance?.accent;
  const color = accent && /^#[0-9a-f]{6}$/i.test(accent) ? accent : "#8794A8";
  const { t } = useTranslation();
  const openPreview = useUIStore((s) => s.openPreview);

  const canPreview = block.preview !== "none";
  const downloadUrl = `${import.meta.env.VITE_API_BASE_URL || ""}/api/files/${block.fileId}/download`;

  const details = (
    <>
      <span
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-xl"
        style={{
          color: `color-mix(in srgb, ${color} 78%, var(--color-ink))`,
          backgroundColor: `color-mix(in srgb, ${color} 12%, var(--color-surface))`,
        }}>
        <FileIcon size={20} strokeWidth={1.8} />
      </span>

      <span className="min-w-0">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-medium">{block.name}</span>
          {block.version > 1 && (
            <span className="shrink-0 rounded-full bg-accent/20 px-1.5 py-0.5 text-[10px] text-accent">
              v{block.version}
            </span>
          )}
        </span>

        <span className="mt-0.5 block text-xs text-muted">
          {block.mime.split("/")[1]?.toUpperCase() || block.mime}
          {" · "}
          {formatBytes(block.size)}
        </span>

        {block.note && (
          <span className="mt-1 block text-xs italic text-muted">
            {block.note}
          </span>
        )}
      </span>
    </>
  );

  return (
    <div className="my-4 flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
      {canPreview ? (
        <button
          type="button"
          onClick={() => openPreview(block)}
          aria-label={t("preview.openFile", { name: block.name })}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1 text-left hover:bg-surface2 focus-visible:outline-accent">
          {details}
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3 p-1">
          {details}
        </div>
      )}

      <a
        href={downloadUrl}
        download
        className="shrink-0 rounded-lg bg-surface2 px-3 py-1.5 text-xs font-medium hover:bg-line">
        {t("common.download")}
      </a>
    </div>
  );
}
