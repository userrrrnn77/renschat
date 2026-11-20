import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { useChatStore } from "../../store/chatStore";
import { UserMessage } from "./UserMessage";
import { AssistantMessage } from "./AssistantMessage";
import { Skeleton } from "../ui/Skeleton";
import { useStickToBottom } from "../../hooks/useStickToBottom";
import { SelectionReplyButton } from "./SelectionReplyButton";

export function MessageList({ sessionId }: { sessionId: string }) {
  const { t } = useTranslation();
  const session = useChatStore((s) => s.bySession[sessionId]);
  const loadOlder = useChatStore((s) => s.loadOlder);
  const containerRef = useRef<HTMLDivElement>(null);

  const messages = session?.messages || [];

  useStickToBottom(containerRef, [messages]);

  if (!session?.loaded) {
    return (
      <div className="min-h-0 overflow-hidden flex-1 p-8 space-y-6 max-w-3xl mx-auto w-full">
        <Skeleton className="h-20 w-2/3 ml-auto" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-20 w-1/2 ml-auto" />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-6 sm:px-6 md:py-10">
      <SelectionReplyButton
        key={sessionId}
        sessionId={sessionId}
        containerRef={containerRef}
      />

      <div className="max-w-3xl mx-auto w-full">
        {session.nextCursor && (
          <div className="flex justify-center mb-6">
            <button
              onClick={() => loadOlder(sessionId)}
              className="text-xs text-muted hover:text-ink px-3 py-1 bg-surface2 rounded-full border border-line">
              {t("chat.loadOlder")}
            </button>
          </div>
        )}

        <div className="flex min-w-0 flex-col gap-8 md:gap-10">
          {messages.map((msg, i) =>
            msg.role === "user" ? (
              <UserMessage key={msg.id} message={msg} sessionId={sessionId} />
            ) : (
              <AssistantMessage
                key={msg.id}
                message={msg}
                sessionId={sessionId}
                isLast={i === messages.length - 1}
              />
            ),
          )}
        </div>
      </div>
    </div>
  );
}
