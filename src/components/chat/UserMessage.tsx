// src/components/chat/UserMessage.tsx
import { useState } from "react";
import { AttachmentCard } from "../preview/AttachmentCard";
import type { ChatMessage } from "../../types";
import { Copy, Check, Pencil, ChevronDown, ChevronUp } from "lucide-react";
import { copyToClipboard } from "../../lib/copy";
import { useTranslation } from "react-i18next";
import { useChatStore } from "../../store/chatStore";
import { cn } from "../../lib/cn";
import { decodeUserTurn } from "../../lib/userTurn";
import { PastedTextBubble } from "./PastedTextBubble";

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

  const rawText = message.blocks
    .filter((b) => b.type === "text")
    .map((b) => (b as { markdown: string }).markdown)
    .join("\n");

  const turn = decodeUserTurn(rawText);
  const text = turn.text;

  // Deteksi apakah pesan ini kepanjangan
  const lines = text.split("\n");
  const isLong = lines.length > MAX_LINES || text.length > MAX_CHARS;

  // Tampilan teks (dipotong kalau belum di-expand)
  const displayText =
    !expanded && isLong
      ? lines.slice(0, MAX_LINES).join("\n").trimEnd() + "..."
      : text;

  const handleCopy = (): void => {
    const content = [
      ...(turn.reply ? [turn.reply.text] : []),
      ...turn.pastes,
      turn.text,
    ].filter(Boolean);

    copyToClipboard(content.join("\n\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleEdit = (): void => {
    if (isStreaming) return;
    startEdit(sessionId, message.id, rawText);
  };

  const canEdit = !isStreaming && message.status === "done";

  return (
    <div className="flex flex-col items-end gap-1.5 group">
      {/* ATTACHMENTS (File yang diupload user) */}
      {message.attachments && message.attachments.length > 0 && (
        <div className="flex max-w-full flex-wrap items-start justify-end gap-2">
          {message.attachments.map((a) => (
            <AttachmentCard
              key={a.id}
              id={a.id}
              name={a.name}
              mime={a.mime}
              size={a.size}
            />
          ))}
        </div>
      )}

      {turn.reply && (
        <blockquote className="max-w-[85%] rounded-xl border border-line bg-surface px-3 py-2">
          <div className="border-l-2 border-accent pl-3">
            <p className="text-xs font-medium text-accent">{t("chat.replyingToAssistant")}</p>
            <details>
              <summary className="cursor-pointer list-none whitespace-pre-wrap wrap-break-word text-sm text-muted">
                {turn.reply.text.length > 180
                  ? `${turn.reply.text.slice(0, 180)}…`
                  : turn.reply.text}
              </summary>
              {turn.reply.text.length > 180 && (
                <p className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap wrap-break-word text-sm text-ink">
                  {turn.reply.text}
                </p>
              )}
            </details>
          </div>
        </blockquote>
      )}

      {turn.pastes.map((paste, index) => (
        <div key={index} className="min-w-0 max-w-[85%]">
          <PastedTextBubble text={paste} index={index} />
        </div>
      ))}

      {text.length > 0 && (
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
      )}

      {/* ACTION BUTTONS */}
      <div className="renschat-actions flex flex-wrap items-center gap-2 pr-2 transition-opacity">
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
