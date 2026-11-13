import { useState } from "react";
import { Markdown } from "../ui/Markdown";
import type { TextBlock } from "../../types";

const MAX_LINES = 25;
const MAX_CHARS = 1500;

export function TextBlockView({ block }: { block: TextBlock }) {
  const [expanded, setExpanded] = useState(false);

  const lines = block.markdown.split("\n");
  const isLong = lines.length > MAX_LINES || block.markdown.length > MAX_CHARS;

  const displayContent =
    !expanded && isLong
      ? lines.slice(0, MAX_LINES).join("\n") + "\n\n..."
      : block.markdown;

  return (
    <div className="relative">
      <Markdown>{displayContent}</Markdown>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-1 text-sm font-medium text-accent hover:underline">
          {expanded ? "Ciutkan" : "Baca selengkapnya"}
        </button>
      )}
    </div>
  );
}
