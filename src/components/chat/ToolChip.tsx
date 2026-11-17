// src/components/chat/ToolChip.tsx
import { Spinner } from "../ui/Spinner";
import { cn } from "../../lib/cn";
import type { ToolRun } from "../../types";
import {
  CheckCircle2,
  XCircle,
  Search,
  FileText,
  Table,
  BarChart2,
  Image as ImageIcon,
  Terminal,
  Film,
  Sparkles,
  Globe,
} from "lucide-react";
import { useTranslation } from "react-i18next";

const icons: Record<string, any> = {
  render_table: Table,
  render_chart: BarChart2,
  render_card: FileText,
  create_file: FileText,
  present_files: FileText,
  generate_pdf: FileText,
  search_attachment: Search,
  inspect_image: ImageIcon,
  run_command: Terminal,
  generate_image: ImageIcon,
  generate_video_cosmos: Film,
  generate_video_python: Sparkles,
  web_scrape: Globe,
};

export function ToolChip({ tool }: { tool: ToolRun }) {
  const { t } = useTranslation();

  if (
    tool.status === "ok" &&
    (tool.name.startsWith("render_") || tool.name.startsWith("generate_")) &&
    tool.name !== "web_scrape"
  ) {
    return null;
  }

  const label = t(`tools.${tool.name}`, {
    defaultValue: t("tools.generic", { name: tool.name }),
  });
  const Icon = icons[tool.name] || Terminal;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border my-1 mr-2",
        tool.status === "running"
          ? "bg-surface2 border-line text-muted"
          : tool.status === "error"
            ? "bg-danger/10 border-danger/20 text-danger"
            : "bg-success/10 border-success/20 text-success",
      )}>
      <Icon className="w-3.5 h-3.5" />
      <span>{tool.status === "ok" ? label.replace("…", "") : label}</span>
      {tool.status === "running" && <Spinner className="w-3 h-3" />}
      {tool.status === "ok" && <CheckCircle2 className="w-3 h-3" />}
      {tool.status === "error" && <XCircle className="w-3 h-3" />}
    </div>
  );
}
