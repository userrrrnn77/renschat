import { ChevronDown, FileText, X } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Props {
  text: string;
  index: number;
  onRemove?: () => void;
}

export function PastedTextBubble({ text, index, onRemove }: Props) {
  const { t } = useTranslation();
  const filename = t("chat.pasteFilename", { index: index + 1 });

  return (
    <div className="relative min-w-0 max-w-full rounded-xl border border-line bg-surface">
      <details className="group/paste">
        <summary
          className={[
            "flex cursor-pointer list-none items-center gap-2 rounded-xl px-3 py-2",
            "text-xs text-ink hover:bg-surface2 focus-visible:outline-accent",
            "[&::-webkit-details-marker]:hidden",
            onRemove ? "pr-10" : "",
          ].join(" ")}>
          <FileText
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-accent"
          />
          <span className="min-w-0 truncate font-medium">{filename}</span>
          <ChevronDown
            aria-hidden="true"
            className="h-3.5 w-3.5 shrink-0 text-muted transition-transform group-open/paste:rotate-180"
          />
        </summary>

        <pre
          tabIndex={0}
          aria-label={t("chat.pasteContents", { filename })}
          className="max-h-72 overflow-auto whitespace-pre-wrap wrap-break-word border-t border-line p-3 font-mono text-xs leading-relaxed text-ink">
          {text}
        </pre>
      </details>

      {onRemove && (
        <button
          type="button"
          aria-label={t("chat.removePaste", { filename })}
          onClick={onRemove}
          className="absolute right-2 top-1.5 rounded p-1 text-muted hover:bg-surface2 hover:text-ink">
          <X aria-hidden="true" className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
