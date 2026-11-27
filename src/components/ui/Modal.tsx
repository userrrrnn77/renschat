import React, { useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "../../lib/cn";

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({
  open,
  onClose,
  onExitComplete,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  onExitComplete?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prevActive = document.activeElement as HTMLElement | null;

    const t = window.setTimeout(() => {
      const root = containerRef.current;
      if (!root) return;
      if (root.contains(document.activeElement)) return;
      const first = root.querySelector<HTMLElement>(FOCUSABLE);
      if (first) first.focus();
      else root.focus();
    }, 0);

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);

    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", handleEsc);
      if (prevActive && typeof prevActive.focus === "function") {
        prevActive.focus();
      }
    };
  }, [open, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab") return;
    const root = containerRef.current;
    if (!root) return;
    const nodes = root.querySelectorAll<HTMLElement>(FOCUSABLE);
    if (nodes.length === 0) {
      e.preventDefault();
      return;
    }
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first || document.activeElement === root) {
        e.preventDefault();
        last.focus();
      }
    } else if (document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return createPortal(
    <AnimatePresence onExitComplete={onExitComplete}>
      {open && (
        <motion.div
          key="modal-root"
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1 },
          }}
          transition={{ duration: 0.16, ease: "easeOut" }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onKeyDown={handleKeyDown}
          ref={containerRef}
          tabIndex={-1}>
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            variants={{
              hidden: { opacity: 0, scale: 0.96, y: 4 },
              visible: { opacity: 1, scale: 1, y: 0 },
            }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className={cn(
              "relative bg-surface border border-line rounded-2xl shadow-xl w-full max-w-md p-6",
              className,
            )}>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
