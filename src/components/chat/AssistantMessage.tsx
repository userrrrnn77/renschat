import { useState } from "react";
import { useChatStore } from "../../store/chatStore";
import { useMediaStore } from "../../store/mediaStore";
import { BlockRenderer } from "../blocks/BlockRenderer";
import { ToolChip } from "./ToolChip";
import { ThinkingIndicator } from "./ThinkingIndicator";
import { ClarificationCard } from "./ClarificationCard";
import { ThinkingPanel } from "./ThinkingPanel";
import { copyToClipboard } from "../../lib/copy";
import { Spinner } from "../ui/Spinner";
import { Copy, Check } from "lucide-react";
import type { ChatMessage } from "../../types";

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
  const setDonateOpen = useMediaStore((s) => s.setDonateOpen);

  const session = useChatStore((s) => s.bySession[sessionId]);
  const phase = session?.phase ?? null;
  const pendingClarification = session?.pendingClarification ?? null;

  const handleCopy = (): void => {
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

  const toolsBefore = (index: number) =>
    (message.tools || []).filter((t) => t.beforeIndex === index);

  const mp = message.mediaProgress;
  const showMediaProgress =
    isStreaming &&
    mp !== undefined &&
    (mp.status === "queued" || mp.status === "running");

  const errorAction =
    message.error?.code === "INSUFFICIENT_CREDITS" ||
    message.error?.code === "ENTITLEMENT_REQUIRED";

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

      {showMediaProgress && mp && (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-surface2 border border-line self-start">
          <Spinner className="w-3 h-3" />
          <span>
            {mp.message
              ? mp.message
              : mp.kind === "image"
                ? "Membuat gambar…"
                : "Membuat video…"}
          </span>
        </div>
      )}

      {pendingClarification && isStreaming && (
        <ClarificationCard
          sessionId={sessionId}
          clarification={pendingClarification}
        />
      )}

      {message.error && (
        <div className="text-sm text-danger bg-danger/10 border border-danger/20 p-3 rounded-lg">
          <p>{message.error.message}</p>
          {errorAction && (
            <button
              type="button"
              onClick={() => setDonateOpen(true)}
              className="mt-2 px-3 py-1.5 rounded-md bg-accent text-accent-fg text-xs font-medium hover:bg-accent-hover transition-colors">
              Buka donasi
            </button>
          )}
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
