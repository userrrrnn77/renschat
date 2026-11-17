// src/components/chat/ThinkingIndicator.tsx
import { useEffect, useState } from "react";
import { SparkleLogo } from "../ui/Icons";
import type { StreamPhase } from "../../types";
import { useTranslation } from "react-i18next";

export function ThinkingIndicator({ phase }: { phase: StreamPhase }) {
  const { t } = useTranslation();

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
      ? t("chat.thinking.waiting")
      : phase === "retrieving"
        ? t("chat.thinking.searching")
        : t("chat.thinking.thinking");

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
