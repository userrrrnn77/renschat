// src/components/chat/ThinkingPanel.tsx
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronDown, ChevronRight, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "../../lib/cn";
import { SourcesList } from "./SourcesList";
import type { StreamPhase, SourceRef } from "../../types";
import { useTranslation } from "react-i18next";
import { formatDuration } from "../../lib/time";

export function ThinkingPanel({
  phase,

  durationMs,
  sources = [],
  isStreaming,
}: {
  phase: StreamPhase;

  durationMs?: number;
  sources?: SourceRef[];
  isStreaming: boolean;
}) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();

  const [expanded, setExpanded] = useState(isStreaming);

  // Auto-collapse saat selesai
  useEffect(() => {
    if (!isStreaming) setExpanded(false);
  }, [isStreaming]);

  const hasSources = sources.length > 0;
  if (!isStreaming && !hasSources) return null;

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
        aria-expanded={expanded}
        onClick={() => setExpanded((open) => !open)}
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

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="thinking-panel-content"
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { duration: 0.22, ease: "easeOut" }
            }
            className="overflow-hidden">
            <div className="border-t border-line px-4 py-3 flex flex-col gap-3">
              {/* Phase Tracker */}
              {isStreaming && (
                <div className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
