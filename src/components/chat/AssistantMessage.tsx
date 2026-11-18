// src/components/chat/AssistantMessage.tsx
import { useMemo, useState } from "react";
import { useChatStore } from "../../store/chatStore";
import { useMediaStore } from "../../store/mediaStore";
import { BlockRenderer } from "../blocks/BlockRenderer";
import { ToolChip } from "./ToolChip";
import { ThinkingIndicator } from "./ThinkingIndicator";
import { ClarificationCard } from "./ClarificationCard";
import { ThinkingPanel } from "./ThinkingPanel";
import { copyToClipboard } from "../../lib/copy";
import { Spinner } from "../ui/Spinner";
import { Copy, Check, RotateCcw } from "lucide-react";
import type { ChatMessage } from "../../types";
import { useTranslation } from "react-i18next";
import {
  redactForUser,
  sanitizeAssistantText,
} from "../../lib/sanitizeAssistantText";
import { errorI18nKey, errorKind, isRetryable } from "../../lib/errorMessages";

export function AssistantMessage({
  message,
  sessionId,
  isLast,
}: {
  message: ChatMessage;
  sessionId: string;
  isLast: boolean;
}) {
  const { t } = useTranslation();

  const [copied, setCopied] = useState(false);
  const isStreaming = message.status === "streaming";
  const setDonateOpen = useMediaStore((s) => s.setDonateOpen);
  const regenerate = useChatStore((s) => s.regenerate);

  const session = useChatStore((s) => s.bySession[sessionId]);
  const phase = session?.phase ?? null;
  const pendingClarification = session?.pendingClarification ?? null;
  const globalStreaming = session?.streaming ?? false;

  const errKind = message.error ? errorKind(message.error.code) : null;
  const localizedError = useMemo(() => {
    if (!message.error) return null;
    const fallback = redactForUser(message.error.message);
    const key = errorI18nKey(message.error.code);
    const translated = t(key);
    return translated && translated !== key ? translated : fallback;
  }, [message.error, t]);

  const handleCopy = (): void => {
    const text = message.blocks
      .map((b) => {
        if (b.type === "text") return sanitizeAssistantText(b.markdown);
        if (b.type === "code")
          return `\`\`\`${b.language}\n${b.content}\n\`\`\``;
        return "";
      })
      .filter(Boolean)
      .join("\n\n");
    copyToClipboard(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleRegenerate = (): void => {
    if (globalStreaming) return;
    if (message.blocks.length === 0 && message.status !== "error") return;
    void regenerate(sessionId, message.id);
  };

  const toolsBefore = (index: number) =>
    (message.tools || []).filter((t) => t.beforeIndex === index);

  const mp = message.mediaProgress;
  const showMediaProgress =
    isStreaming &&
    mp !== undefined &&
    (mp.status === "queued" || mp.status === "running");

  const mediaProgressLabel =
    mp?.kind === "image" ? t("chat.makingImage") : t("chat.makingVideo");

  const canRetryFromError =
    message.status === "error" &&
    isRetryable(message.error?.code) &&
    isLast &&
    !globalStreaming;

  const canRegenerate =
    isLast &&
    !globalStreaming &&
    !isStreaming &&
    message.status !== "error" &&
    message.blocks.length > 0;

  return (
    <div className="flex flex-col gap-4 py-4 group">
      {message.blocks.length === 0 &&
        isStreaming &&
        !pendingClarification &&
        !message.thinking?.text && <ThinkingIndicator phase={phase} />}

      {message.thinking || message.sources ? (
        <ThinkingPanel
          phase={phase}
          thinkingText={message.thinking?.text ?? ""}
          thinkingDone={message.thinking?.done ?? true}
          durationMs={message.thinking?.durationMs}
          sources={message.sources}
          isStreaming={isStreaming}
        />
      ) : null}

      {message.blocks.map((block, i) => (
        <div key={i}>
          {toolsBefore(i).map((tool) => (
            <ToolChip key={tool.callId} tool={tool} />
          ))}
          <BlockRenderer block={block} sessionId={sessionId} isLast={isLast} />
        </div>
      ))}

      {(message.tools || [])
        .filter((tool) => tool.beforeIndex >= message.blocks.length)
        .map((tool) => (
          <ToolChip key={tool.callId} tool={tool} />
        ))}

      {showMediaProgress && (
        <div
          aria-live="polite"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-surface2 border border-line self-start">
          <Spinner className="w-3 h-3" />
          <span>{mediaProgressLabel}</span>
        </div>
      )}

      {pendingClarification && isStreaming && (
        <ClarificationCard
          sessionId={sessionId}
          clarification={pendingClarification}
        />
      )}

      {localizedError && (
        <div className="text-sm text-danger bg-danger/10 border border-danger/20 p-3 rounded-lg">
          <p className="whitespace-pre-wrap wrap-break-word">
            {localizedError}
          </p>
          {(errKind === "credits" || canRetryFromError) && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {errKind === "credits" && (
                <button
                  type="button"
                  onClick={() => setDonateOpen(true)}
                  className="px-3 py-1.5 rounded-md bg-accent text-accent-fg text-xs font-medium hover:bg-accent-hover transition-colors">
                  {t("chat.openDonation")}
                </button>
              )}
              {canRetryFromError && (
                <button
                  type="button"
                  onClick={handleRegenerate}
                  className="px-3 py-1.5 rounded-md bg-surface border border-line text-ink text-xs font-medium hover:bg-surface2 transition-colors flex items-center gap-1">
                  <RotateCcw className="w-3.5 h-3.5" />
                  {t("chat.retry")}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {!isStreaming && message.blocks.length > 0 && (
        <div className="flex items-center gap-4 text-xs text-muted mt-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 hover:text-ink transition-colors">
            {copied ? (
              <Check className="w-4 h-4 text-success" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            {t("common.copy")}
          </button>
          {canRegenerate && (
            <button
              type="button"
              onClick={handleRegenerate}
              className="flex items-center gap-1 hover:text-ink transition-colors"
              title={t("chat.regenerate")}>
              <RotateCcw className="w-4 h-4" />
              {t("chat.regenerate")}
            </button>
          )}
          {message.status === "aborted" && (
            <span className="text-warning font-medium">
              {t("chat.stopped")}
            </span>
          )}
          {message.status === "error" && (
            <span className="text-danger font-medium">
              {t("chat.errorOccurred")}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
