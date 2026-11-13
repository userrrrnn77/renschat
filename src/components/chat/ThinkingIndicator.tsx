// src/components/chat/ThinkingIndicator.tsx
import { useEffect, useState } from "react";
import { SparkleLogo } from "../ui/Icons";
import type { StreamPhase } from "../../types";

export function ThinkingIndicator({ phase }: { phase: StreamPhase }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const label =
    phase === "clarifying"
      ? "Menunggu jawabanmu"
      : phase === "retrieving"
        ? "Mencari di dokumen"
        : "Berpikir";

  return (
    <div className="flex items-center gap-2 text-muted py-2">
      <SparkleLogo className="w-4 h-4 text-accent" animate={true} />
      <span className="text-sm font-medium animate-pulse">
        {label}
        {elapsed > 0 && ` · ${elapsed} dtk`}…
      </span>
    </div>
  );
}
