// src/components/blocks/TextBlockView.tsx
import { useMemo, useState } from "react";
import { Markdown } from "../ui/Markdown";
import type { TextBlock } from "../../types";
import { useTranslation } from "react-i18next";
import { sanitizeAssistantText } from "../../lib/sanitizeAssistantText";

const MAX_LINES = 30;
const MAX_CHARS = 2200;

export function TextBlockView({
  block,
  isStreaming,
}: {
  block: TextBlock;
  isStreaming: boolean;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const cleanMarkdown = useMemo(
    () => sanitizeAssistantText(block.markdown),
    [block.markdown],
  );

  if (!cleanMarkdown) return null;

  const lines = cleanMarkdown.split("\n");
  const isLong = lines.length > MAX_LINES || cleanMarkdown.length > MAX_CHARS;

  const canCollapse = isLong && !isStreaming;
  const displayContent =
    canCollapse && !expanded
      ? lines.slice(0, MAX_LINES).join("\n").slice(0, MAX_CHARS).trimEnd() +
        "\n\n…"
      : cleanMarkdown;

  return (
    <div className="relative">
      <Markdown>{displayContent}</Markdown>
      {canCollapse && (
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-sm font-medium text-accent hover:text-accent-hover transition-colors">
            {expanded ? t("blocks.collapse") : t("blocks.readMore")}
          </button>
        </div>
      )}
    </div>
  );
}
