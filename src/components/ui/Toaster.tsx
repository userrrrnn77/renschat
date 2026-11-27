import { AnimatePresence, motion } from "motion/react";
import { useToastStore } from "../../store/toastStore";
import { cn } from "../../lib/cn";

export function Toaster() {
  const { toasts, dismiss } = useToastStore();

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            onClick={() => dismiss(t.id)}
            className={cn(
              "px-4 py-3 rounded-lg shadow-lg text-sm font-medium cursor-pointer",
              t.kind === "error"
                ? "bg-danger text-white"
                : t.kind === "success"
                  ? "bg-success text-white"
                  : "bg-surface2 text-ink border border-line",
            )}>
            {t.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
