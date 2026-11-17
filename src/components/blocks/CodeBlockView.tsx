import { useState, useEffect } from "react";
import { highlightCode } from "../../lib/highlight";
import { copyToClipboard } from "../../lib/copy";
import { cn } from "../../lib/cn";
import { useTranslation } from "react-i18next";
import type { CodeBlock } from "../../types";

export function CodeBlockView({ block }: { block: CodeBlock }) {
  const { t } = useTranslation();

  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [html, setHtml] = useState("");

  const lines = block.content.split("\n");
  const isLong = lines.length > 40;
  const displayContent =
    !expanded && isLong ? lines.slice(0, 20).join("\n") : block.content;

  useEffect(() => {
    // Only highlight when not streaming (simplified check: no "streaming" prop, we assume block is final if it has content)
    setHtml(highlightCode(displayContent, block.language));
  }, [displayContent, block.language]);

  const handleCopy = async () => {
    if (await copyToClipboard(block.content)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const downloadFile = () => {
    const blob = new Blob([block.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = block.filename || `code.${block.language}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative group rounded-xl overflow-hidden border border-line bg-codebg my-4 font-mono text-[13px]">
      <div className="flex items-center justify-between px-4 py-2 bg-codehead border-b border-line text-xs text-muted select-none">
        <span>{block.filename || block.language.toLowerCase()}</span>
        <div className="flex gap-3">
          {block.filename && (
            <button
              onClick={downloadFile}
              className="hover:text-ink transition-colors">
              {t("common.download")}
            </button>
          )}
          <button
            onClick={handleCopy}
            className="hover:text-ink transition-colors w-12 text-right">
            {copied ? t("common.copied") : t("common.copy")}
          </button>
        </div>
      </div>
      <div
        className={cn(
          "relative overflow-x-auto p-4",
          !expanded && isLong && "max-h-100 overflow-y-hidden",
        )}>
        <pre>
          <code dangerouslySetInnerHTML={{ __html: html }} />
        </pre>
        {!expanded && isLong && (
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-linear-to-t from-codebg to-transparent" />
        )}
      </div>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full py-2 bg-codehead text-xs text-muted hover:text-ink border-t border-line transition-colors">
          {expanded ? t("blocks.collapse") : t("blocks.expand")}
        </button>
      )}
    </div>
  );
}
