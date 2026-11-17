// src/components/chat/UserMessage.tsx
import { formatBytes } from "../../lib/files";
import type { ChatMessage } from "../../types";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { copyToClipboard } from "../../lib/copy";
import { useTranslation } from "react-i18next";

export function UserMessage({ message }: { message: ChatMessage }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const text = message.blocks
    .filter((b) => b.type === "text")
    .map((b) => (b as any).markdown)
    .join("\n");

  const handleCopy = () => {
    copyToClipboard(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex flex-col items-end gap-1.5 group">
      {message.attachments && message.attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-end">
          {message.attachments.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-2 px-3 py-1.5 bg-surface2 border border-line rounded-lg text-xs">
              <span className="truncate max-w-37.5 font-medium">{a.name}</span>
              <span className="text-muted">{formatBytes(a.size)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Bubble Chat */}
      <div className="max-w-[85%] bg-surface2 rounded-2xl px-5 py-3 text-[15px] whitespace-pre-wrap">
        {text}
      </div>

      {/* Tombol Copy di bawah */}
      <div className="flex items-center gap-2 pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs text-muted hover:text-ink transition-colors"
          title={t("common.copy")}>
          {copied ? (
            <Check className="w-3.5 h-3.5 text-success" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
          <span>{copied ? t("common.copied") : t("common.copy")}</span>
        </button>
      </div>
    </div>
  );
}
