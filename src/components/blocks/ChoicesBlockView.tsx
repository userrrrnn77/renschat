// src/components/blocks/ChoicesBlockView.tsx

import { useState } from "react";
import { cn } from "../../lib/cn";
import type { ChoicesBlock } from "../../types";
import { useChatStore } from "../../store/chatStore";

export function ChoicesBlockView({
  block,
  sessionId,
  isLast,
}: {
  block: ChoicesBlock;
  sessionId: string;
  isLast: boolean;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const isStreaming = useChatStore((s) => s.bySession[sessionId]?.streaming);
  const send = useChatStore((s) => s.send);

  // Mode read-only: blok sudah punya `answer` (baik dari klarifikasi
  // hold-and-resume Phase 1, maupun hasil reload setelahnya).
  const isReadOnly = Array.isArray(block.answer);
  const selectedFromAnswer = isReadOnly ? block.answer : [];

  const handleSelect = (val: string): void => {
    if (isReadOnly || !isLast || isStreaming) return;
    if (!block.multi) send(sessionId, val, []);
    else
      setSelected((prev) =>
        prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val],
      );
  };

  const canInteract = !isReadOnly && isLast && !isStreaming;

  return (
    <div className="my-4 p-5 border border-line rounded-xl bg-surface">
      <p className="font-semibold mb-4">{block.question}</p>
      <div className="flex flex-col gap-2">
        {block.options.map((opt, i) => {
          const val = opt.value || opt.label;
          const isSelected = isReadOnly
            ? selectedFromAnswer?.includes(val) ||
              selectedFromAnswer?.includes(opt.label)
            : selected.includes(val);
          return (
            <button
              key={i}
              disabled={!canInteract}
              onClick={() => handleSelect(val)}
              className={cn(
                "text-left px-4 py-3 border rounded-lg text-sm transition-colors",
                isSelected
                  ? "border-accent bg-accent/10"
                  : "border-line hover:bg-surface2",
                !canInteract && "opacity-60 cursor-not-allowed",
              )}>
              {opt.label}
            </button>
          );
        })}
      </div>
      {!isReadOnly && block.multi && canInteract && (
        <button
          disabled={selected.length === 0}
          onClick={() => send(sessionId, selected.join(", "), [])}
          className="mt-4 w-full py-2 bg-accent text-accent-fg rounded-lg text-sm font-medium hover:bg-accent-hover disabled:opacity-50 transition-colors">
          Kirim Pilihan
        </button>
      )}
    </div>
  );
}
