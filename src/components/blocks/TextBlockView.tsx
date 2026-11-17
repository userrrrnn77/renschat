// src/components/blocks/TextBlockView.tsx
import { useState } from "react";
import { Markdown } from "../ui/Markdown";
import type { TextBlock } from "../../types";
import { useTranslation } from "react-i18next";

const MAX_LINES = 25;
const MAX_CHARS = 1500;

export function TextBlockView({ block }: { block: TextBlock }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  // Bersihin teks dari tag <tool_call> yang bocor dari model (Nemotron)
  const cleanMarkdown = block.markdown
    .replace(
      /<tool_call>[\s\S]*?<\/tool_call>/gi,
      `\n\n*${t("blocks.toolCallError")}*\n\n`,
    )
    .replace(/<function=[^>]+>[\s\S]*?<\/function>/gi, "")
    .replace(/<parameter=[^>]+>[\s\S]*?<\/parameter>/gi, "")
    .trim();

  if (!cleanMarkdown) return null;

  const lines = cleanMarkdown.split("\n");
  const isLong = lines.length > MAX_LINES || cleanMarkdown.length > MAX_CHARS;

  const displayContent =
    !expanded && isLong
      ? lines.slice(0, MAX_LINES).join("\n") + "\n\n..."
      : cleanMarkdown;

  return (
    <div className="relative">
      <Markdown>{displayContent}</Markdown>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-1 text-sm font-medium text-accent hover:underline">
          {expanded ? t("blocks.collapse") : t("blocks.readMore")}
        </button>
      )}
    </div>
  );
}
