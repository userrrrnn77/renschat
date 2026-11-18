// src/components/chat/ClarificationCard.tsx
import { useEffect, useState } from "react";
import { cn } from "../../lib/cn";
import { useChatStore } from "../../store/chatStore";
import type { PendingClarification } from "../../types";
import { useTranslation } from "react-i18next";
import { Spinner } from "../ui/Spinner";

export function ClarificationCard({
  sessionId,
  clarification,
}: {
  sessionId: string;
  clarification: PendingClarification;
}) {
  const { t } = useTranslation();

  const respond = useChatStore((s) => s.respond);

  const [selected, setSelected] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showCustom, setShowCustom] = useState(false);
  const [customText, setCustomText] = useState("");
  const [remainingMs, setRemainingMs] = useState(clarification.timeoutMs);

  useEffect(() => {
    const start = clarification.receivedAt;
    const total = clarification.timeoutMs;
    const tick = (): void => {
      const left = Math.max(0, total - (Date.now() - start));
      setRemainingMs(left);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [clarification.receivedAt, clarification.timeoutMs]);

  const expired = remainingMs <= 0;

  const handleSubmit = async (answer: string[]): Promise<void> => {
    if (submitting || expired || answer.length === 0) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await respond(sessionId, clarification.questionId, answer);
      // Store akan clear pendingClarification saat SSE clarification.resolved
      // masuk. Kartu ini akan unmount otomatis.
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? `${t("clarification.error", { message: err.message })}`
          : `${t("clarification.error", { message: "" })}`,
      );
      setSubmitting(false);
    }
  };

  const handleOptionClick = (val: string): void => {
    if (submitting || expired) return;
    if (clarification.multi) {
      setSelected((prev) =>
        prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val],
      );
    } else {
      void handleSubmit([val]);
    }
  };

  const handleCustomSubmit = (): void => {
    const val = customText.trim();
    if (!val) return;
    void handleSubmit([val]);
  };

  const disabled = submitting || expired;

  return (
    <div className="my-4 p-5 border border-line rounded-xl bg-surface">
      <div className="flex items-start justify-between gap-3 mb-3">
        <p className="font-semibold">{clarification.question}</p>
        <span className="text-[11px] text-muted shrink-0">
          {t("clarification.seconds", { count: Math.ceil(remainingMs / 1000) })}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {clarification.options.map((opt, i) => {
          const val = opt.value ?? opt.label;
          const isSelected = selected.includes(val);
          return (
            <button
              key={i}
              disabled={disabled}
              onClick={() => handleOptionClick(val)}
              className={cn(
                "text-left px-4 py-3 border rounded-lg text-sm transition-colors",
                isSelected
                  ? "border-accent bg-accent/10"
                  : "border-line hover:bg-surface2",
                disabled && "opacity-60 cursor-not-allowed",
              )}>
              {opt.label}
            </button>
          );
        })}
      </div>

      {!showCustom ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setShowCustom(true)}
          className="mt-3 text-xs text-muted hover:text-ink underline underline-offset-2 disabled:opacity-50">
          {t("clarification.others")}
        </button>
      ) : (
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            disabled={disabled}
            placeholder={t("clarification.customPlaceholder")}
            className="flex-1 bg-bg border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent disabled:opacity-60"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleCustomSubmit();
              }
            }}
          />
          <button
            type="button"
            disabled={disabled || customText.trim().length === 0}
            onClick={handleCustomSubmit}
            className="px-3 py-2 bg-accent text-accent-fg rounded-lg text-sm font-medium hover:bg-accent-hover disabled:opacity-50 transition-colors">
            {t("clarification.send")}
          </button>
        </div>
      )}

      {clarification.multi && (
        <button
          type="button"
          disabled={disabled || selected.length === 0}
          onClick={() => void handleSubmit(selected)}
          className="mt-3 w-full py-2 bg-accent text-accent-fg rounded-lg text-sm font-medium hover:bg-accent-hover disabled:opacity-50 transition-colors">
          {t("blocks.sendChoices")}
        </button>
      )}

      {submitting && (
        <div className="mt-3 flex items-center gap-2 text-xs text-muted">
          <Spinner className="w-3.5 h-3.5" />
          <span>{t("clarification.sending")}</span>
        </div>
      )}

      {submitError && (
        <div className="mt-3 text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg p-2">
          {submitError}
        </div>
      )}

      {expired && !submitting && (
        <div className="mt-3 text-xs text-warning">
          {t("clarification.timeout")}
        </div>
      )}
    </div>
  );
}
