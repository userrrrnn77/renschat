// src/components/chat/ThinkingPanel.tsx
import { useEffect, useState, useRef } from "react";
import { ChevronDown, ChevronRight, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "../../lib/cn";
import { SourcesList } from "./SourcesList";
import type { StreamPhase, SourceRef } from "../../types";
import { useTranslation } from "react-i18next";
import { formatDuration } from "../../lib/time";

export function ThinkingPanel({
  phase,
  thinkingText,
  thinkingDone,
  durationMs,
  sources,
  isStreaming,
}: {
  phase: StreamPhase;
  thinkingText: string;
  thinkingDone: boolean;
  durationMs?: number;
  sources?: SourceRef[];
  isStreaming: boolean;
}) {
  const { t } = useTranslation();

  const [expanded, setExpanded] = useState(isStreaming);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-collapse saat selesai
  useEffect(() => {
    if (!isStreaming) setExpanded(false);
  }, [isStreaming]);

  // Auto-scroll saat streaming
  useEffect(() => {
    if (expanded && isStreaming && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [thinkingText, expanded, isStreaming]);

  const hasThinking = thinkingText.length > 0;
  const hasSources = sources && sources.length > 0;
  if (!hasThinking && !hasSources) return null;

  const phaseSteps = [
    { id: "clarifying", label: t("chat.thinking.clarifying") },
    { id: "retrieving", label: t("chat.thinking.searching") },
    { id: "generating", label: t("chat.thinking.generating") },
  ];

  const currentPhaseIdx = phase
    ? phaseSteps.findIndex((p) => p.id === phase)
    : -1;

  return (
    <div className="my-3 border border-line rounded-xl bg-surface/50 overflow-hidden text-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-surface2/50 transition-colors">
        <div className="flex items-center gap-2 font-medium text-muted">
          {expanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
          <span>{t("chat.thinking.process")}</span>
          {durationMs !== undefined && (
            <span className="text-xs opacity-70">
              ({formatDuration(Math.floor(durationMs / 1000), t)})
            </span>
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-line px-4 py-3 flex flex-col gap-3">
          {/* Phase Tracker */}
          {isStreaming && (
            <div className="flex items-center gap-3 text-xs mb-1">
              {phaseSteps.map((step, idx) => {
                const isDone = currentPhaseIdx > idx || !isStreaming;
                const isActive = currentPhaseIdx === idx && isStreaming;
                return (
                  <div
                    key={step.id}
                    className={cn(
                      "flex items-center gap-1.5",
                      isDone
                        ? "text-success"
                        : isActive
                          ? "text-accent font-medium"
                          : "text-muted opacity-50",
                    )}>
                    {isDone ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : isActive ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border border-current opacity-50" />
                    )}
                    {step.label}
                  </div>
                );
              })}
            </div>
          )}

          {/* Thinking Text */}
          {hasThinking && (
            <div
              ref={scrollRef}
              className="max-h-60 overflow-y-auto bg-surface2/30 rounded-lg p-3 text-xs text-muted whitespace-pre-wrap font-mono leading-relaxed">
              {thinkingText}
              {!thinkingDone && <span className="animate-pulse">_</span>}
            </div>
          )}

          {/* Sources */}
          {hasSources && (
            <div>
              <p className="text-xs font-semibold text-muted mb-2">
                {t("chat.thinking.sources")}
              </p>
              <SourcesList sources={sources} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
