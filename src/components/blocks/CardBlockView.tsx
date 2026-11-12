import { Markdown } from "../ui/Markdown";
import { cn } from "../../lib/cn";
import type { CardBlock } from "../../types";
import { useChatStore } from "../../store/chatStore";

export function CardBlockView({
  block,
  sessionId,
}: {
  block: CardBlock;
  sessionId: string;
}) {
  const isStreaming = useChatStore((s) => s.bySession[sessionId]?.streaming);
  const send = useChatStore((s) => s.send);

  const toneClasses = {
    neutral: "border-l-line bg-surface",
    info: "border-l-info bg-info/5",
    success: "border-l-success bg-success/5",
    warning: "border-l-warning bg-warning/5",
    danger: "border-l-danger bg-danger/5",
  };

  return (
    <div
      className={cn(
        "my-4 p-5 border border-line border-l-[3px] rounded-xl",
        toneClasses[block.tone || "neutral"],
      )}>
      <h3 className="font-semibold text-base">{block.title}</h3>
      {block.subtitle && (
        <p className="text-sm text-muted mt-0.5">{block.subtitle}</p>
      )}
      {block.markdown && (
        <div className="mt-2">
          <Markdown>{block.markdown}</Markdown>
        </div>
      )}
      {block.actions && block.actions.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4">
          {block.actions.map((a, i) => (
            <button
              key={i}
              disabled={isStreaming}
              onClick={() => send(sessionId, a.prompt, [])}
              className="px-3 py-1.5 text-sm font-medium bg-surface2 hover:bg-line border border-line rounded-lg transition-colors disabled:opacity-50">
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
