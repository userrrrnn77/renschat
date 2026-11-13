// src/components/blocks/FileBlockView.tsx
import { formatBytes, getExt } from "../../lib/files";
import type { FileBlock } from "../../types";
import { useUIStore } from "../../store/uiStore";

export function FileBlockView({ block }: { block: FileBlock }) {
  const openPreview = useUIStore((s) => s.openPreview);

  return (
    <div
      onClick={() => (block.preview !== "none" ? openPreview(block) : null)}
      className="my-4 flex items-center justify-between p-4 bg-surface border border-line rounded-xl hover:border-accent/50 transition-colors cursor-pointer group">
      <div className="flex items-center gap-3 overflow-hidden">
        <div className="w-10 h-10 shrink-0 bg-surface2 rounded-lg flex items-center justify-center text-xl font-bold text-muted uppercase">
          {getExt(block.name)}
        </div>
        <div className="truncate">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{block.name}</span>
            {block.version > 1 && (
              <span className="text-[10px] bg-accent/20 text-accent px-1.5 py-0.5 rounded-full font-semibold">
                v{block.version}
              </span>
            )}
          </div>
          <p className="text-xs text-muted mt-0.5">
            {block.mime.split("/")[1]?.toUpperCase() || block.mime} •{" "}
            {formatBytes(block.size)}
          </p>
          {block.note && (
            <p className="text-xs text-muted mt-1 italic">{block.note}</p>
          )}
        </div>
      </div>
      <a
        href={`${import.meta.env.VITE_API_BASE_URL || ""}/api/files/${block.fileId}/download`}
        onClick={(e) => e.stopPropagation()}
        className="px-3 py-1.5 text-xs font-medium bg-surface2 hover:bg-line rounded-lg transition-colors shrink-0"
        download>
        Unduh
      </a>
    </div>
  );
}
