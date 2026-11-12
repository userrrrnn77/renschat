import { useState } from "react";
import { useChatStore } from "../../store/chatStore";
import { BlockRenderer } from "../blocks/BlockRenderer";
import { ToolChip } from "./ToolChip";
import { ThinkingIndicator } from "./ThinkingIndicator";
import { copyToClipboard } from "../../lib/copy";
import { Copy, Check } from "lucide-react";
import type { ChatMessage } from "../../types";
import { cn } from "../../lib/cn";

export function AssistantMessage({
  message,
  sessionId,
  isLast,
}: {
  message: ChatMessage;
  sessionId: string;
  isLast: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const isStreaming = message.status === "streaming";

  const handleCopy = () => {
    const text = message.blocks
      .map((b) => {
        if (b.type === "text") return b.markdown;
        if (b.type === "code")
          return `\`\`\`${b.language}\n${b.content}\n\`\`\``;
        return "";
      })
      .join("\n\n");
    copyToClipboard(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Group tools by beforeIndex
  const toolsBefore = (index: number) =>
    (message.tools || []).filter((t) => t.beforeIndex === index);

  return (
    <div className="flex flex-col gap-4 py-4 group">
      {message.blocks.length === 0 && isStreaming && <ThinkingIndicator />}

      {message.blocks.map((block, i) => (
        <div key={i}>
          {toolsBefore(i).map((t) => (
            <ToolChip key={t.callId} tool={t} />
          ))}
          <BlockRenderer block={block} sessionId={sessionId} isLast={isLast} />
        </div>
      ))}

      {(message.tools || [])
        .filter((t) => t.beforeIndex >= message.blocks.length)
        .map((t) => (
          <ToolChip key={t.callId} tool={t} />
        ))}

      {message.error && (
        <div className="text-sm text-danger bg-danger/10 border border-danger/20 p-3 rounded-lg">
          {message.error.message}
        </div>
      )}

      {!isStreaming && message.blocks.length > 0 && (
        <div className="flex items-center gap-4 text-xs text-muted mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 hover:text-ink">
            {copied ? (
              <Check className="w-4 h-4 text-success" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            Salin
          </button>
          {message.status === "aborted" && (
            <span className="text-warning font-medium">Dihentikan</span>
          )}
          {message.status === "error" && (
            <span className="text-danger font-medium">Terjadi kesalahan</span>
          )}
        </div>
      )}
    </div>
  );
}
