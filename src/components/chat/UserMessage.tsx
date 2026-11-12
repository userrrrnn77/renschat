import { formatBytes } from "../../lib/files";
import type { ChatMessage } from "../../types";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { copyToClipboard } from "../../lib/copy";

export function UserMessage({ message }: { message: ChatMessage }) {
  const [copied, setCopied] = useState(false);
  const text = message.blocks
    .filter((b) => b.type === "text")
    .map((b) => (b as any).markdown)
    .join("\n");

  return (
    <div className="flex flex-col items-end gap-2 group">
      {message.attachments && message.attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-end">
          {message.attachments.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-2 px-3 py-1.5 bg-surface2 border border-line rounded-lg text-xs">
              <span className="truncate max-w-37.5 font-medium">
                {a.name}
              </span>
              <span className="text-muted">{formatBytes(a.size)}</span>
            </div>
          ))}
        </div>
      )}
      <div className="relative max-w-[85%] bg-surface2 rounded-2xl px-5 py-3 text-[15px] whitespace-pre-wrap">
        {text}
        <button
          onClick={() => {
            copyToClipboard(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="absolute -right-8 bottom-2 p-1.5 text-muted hover:text-ink opacity-0 group-hover:opacity-100 transition-all">
          {copied ? (
            <Check className="w-4 h-4 text-success" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}
