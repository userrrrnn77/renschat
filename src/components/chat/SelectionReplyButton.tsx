import { useEffect, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Reply } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useComposerStore } from "../../store/composerStore";

interface Props {
  sessionId: string;
  containerRef: RefObject<HTMLDivElement | null>;
}

interface SelectedQuote {
  messageId: string;
  text: string;
  x: number;
  y: number;
  above: boolean;
}

function elementFor(node: Node): Element | null {
  return node instanceof Element ? node : node.parentElement;
}

export function SelectionReplyButton({ sessionId, containerRef }: Props) {
  const { t } = useTranslation();
  const setReply = useComposerStore((s) => s.setReply);
  const [quote, setQuote] = useState<SelectedQuote | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let frame = 0;

    function updateSelection() {
      const selection = window.getSelection();

      if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
        setQuote(null);
        return;
      }

      const range = selection.getRangeAt(0);
      const start = elementFor(range.startContainer);
      const source = start?.closest<HTMLElement>("[data-reply-source]");
      const messageId = source?.dataset.replySource;

      if (
        !source ||
        !messageId ||
        !container?.contains(source) ||
        !source.contains(range.endContainer)
      ) {
        setQuote(null);
        return;
      }

      const text = selection.toString();
      if (!text.trim()) {
        setQuote(null);
        return;
      }

      const viewport = container.getBoundingClientRect();
      const top = Math.max(0, viewport.top);
      const bottom = Math.min(window.innerHeight, viewport.bottom);

      // Pakai baris seleksi pertama yang masih terlihat di area chat.
      // Ini juga menangani seleksi yang melewati inline code atau beberapa baris.
      const rect = Array.from(range.getClientRects()).find(
        (r) => r.width > 0 && r.height > 0 && r.bottom > top && r.top < bottom,
      );

      if (!rect) {
        setQuote(null);
        return;
      }

      const above = rect.top >= top + 44;
      setQuote({
        messageId,
        text,
        x: Math.max(8, Math.min(rect.left, window.innerWidth - 8)),
        y: above ? rect.top - 6 : Math.min(rect.bottom + 6, bottom - 36),
        above,
      });
    }

    function scheduleUpdate() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateSelection);
    }

    document.addEventListener("selectionchange", scheduleUpdate);
    document.addEventListener("pointerup", scheduleUpdate);
    window.addEventListener("scroll", scheduleUpdate, true);
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("selectionchange", scheduleUpdate);
      document.removeEventListener("pointerup", scheduleUpdate);
      window.removeEventListener("scroll", scheduleUpdate, true);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [containerRef, sessionId]);

  if (!quote) return null;

  function handleReply() {
    if (!quote) return;

    setReply(sessionId, {
      messageId: quote.messageId,
      text: quote.text,
    });

    window.getSelection()?.removeAllRanges();
    setQuote(null);
    document.getElementById(`composer-${sessionId}`)?.focus();
  }

  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-2 z-100 flex"
      style={{
        top: quote.y,
        transform: quote.above ? "translateY(-100%)" : undefined,
      }}>
      <button
        type="button"
        onPointerDown={(event) => event.preventDefault()}
        onClick={handleReply}
        style={{
          marginLeft: `clamp(0px, ${quote.x - 8}px, max(0px, 100% - 11rem))`,
        }}
        className="pointer-events-auto inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-xs font-medium text-ink shadow-lg hover:bg-surface2 focus-visible:outline-accent">
        <Reply
          aria-hidden="true"
          className="h-3.5 w-3.5 shrink-0 text-accent"
        />
        {t("chat.quoteSelection")}
      </button>
    </div>,
    document.body,
  );
}
