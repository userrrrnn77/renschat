// src/components/chat/ToolChip.tsx
import { Spinner } from "../ui/Spinner";
import { cn } from "../../lib/cn";
import type { ToolRun } from "../../types";
import { AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getToolProgressLabel } from "../../lib/toolLabels";

/**
 * Indikator progres tool. Tidak pernah menampilkan nama tool, parameter,
 * argumen, maupun ringkasan internal. Hanya kategori generik.
 */
export function ToolChip({ tool }: { tool: ToolRun }) {
  const { i18n } = useTranslation();

  // Tool yang selesai sudah direpresentasikan oleh blok hasilnya di UI.
  if (tool.status === "ok") return null;

  const label = getToolProgressLabel(tool.name, tool.status, i18n.language);
  const isRunning = tool.status === "running";

  return (
    <div
      aria-live="polite"
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border my-1 mr-2",
        isRunning
          ? "bg-surface2 border-line text-muted"
          : "bg-danger/10 border-danger/20 text-danger",
      )}>
      {isRunning ? (
        <Spinner className="w-3 h-3" />
      ) : (
        <AlertCircle className="w-3 h-3" />
      )}
      <span>{label}</span>
    </div>
  );
}
