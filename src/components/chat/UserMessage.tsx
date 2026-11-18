// src/components/chat/UserMessage.tsx
import { useState } from "react";
import { formatBytes } from "../../lib/files";
import type { ChatMessage } from "../../types";
import { Copy, Check, Pencil, ChevronDown, ChevronUp } from "lucide-react";
import { copyToClipboard } from "../../lib/copy";
import { useTranslation } from "react-i18next";
import { useChatStore } from "../../store/chatStore";
import { cn } from "../../lib/cn";

const MAX_LINES = 10;
const MAX_CHARS = 500;

export function UserMessage({
  message,
  sessionId,
}: {
  message: ChatMessage;
  sessionId: string;
}) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const isStreaming = useChatStore(
    (s) => s.bySession[sessionId]?.streaming ?? false,
  );
  const startEdit = useChatStore((s) => s.startEdit);

  const text = message.blocks
    .filter((b) => b.type === "text")
    .map((b) => (b as { markdown: string }).markdown)
    .join("\n");

  // Deteksi apakah pesan ini kepanjangan
  const lines = text.split("\n");
  const isLong = lines.length > MAX_LINES || text.length > MAX_CHARS;

  // Tampilan teks (dipotong kalau belum di-expand)
  const displayText =
    !expanded && isLong
      ? lines.slice(0, MAX_LINES).join("\n").trimEnd() + "..."
      : text;

  const handleCopy = (): void => {
    copyToClipboard(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleEdit = (): void => {
    if (isStreaming) return;
    startEdit(sessionId, message.id, text);
  };

  const canEdit = !isStreaming && message.status === "done";

  return (
    <div className="flex flex-col items-end gap-1.5 group">
      {/* ATTACHMENTS (File yang diupload user) */}
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

      {/* BUBBLE TEXT DENGAN FITUR EXPAND */}
      <div className="max-w-[85%] flex flex-col items-end">
        <div
          className={cn(
            "bg-surface2 rounded-2xl px-5 py-3 text-[15px] whitespace-pre-wrap relative",
            isLong && !expanded && "max-h-48 overflow-hidden",
          )}>
          {displayText}

          {/* Gradient fade di bawah kalau teksnya kepanjangan */}
          {isLong && !expanded && (
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-linear-to-t from-surface2 to-transparent pointer-events-none rounded-b-2xl" />
          )}
        </div>

        {/* Tombol Expand/Collapse */}
        {isLong && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 mt-1 text-xs font-medium text-muted hover:text-ink transition-colors pr-2">
            {expanded ? (
              <>
                {" "}
                {t("blocks.collapse")} <ChevronUp className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                {" "}
                {t("blocks.readMore")} <ChevronDown className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        )}
      </div>

      {/* ACTION BUTTONS */}
      <div className="flex items-center gap-2 pr-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        {canEdit && (
          <button
            onClick={handleEdit}
            className="flex items-center gap-1 text-xs text-muted hover:text-ink transition-colors"
            title={t("chat.edit")}>
            <Pencil className="w-3.5 h-3.5" />
            <span>{t("chat.edit")}</span>
          </button>
        )}
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
