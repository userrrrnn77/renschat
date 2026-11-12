import { useToastStore } from "../../store/toastStore";
import { cn } from "../../lib/cn";

export function Toaster() {
  const { toasts, dismiss } = useToastStore();

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => dismiss(t.id)}
          className={cn(
            "px-4 py-3 rounded-lg shadow-lg text-sm font-medium cursor-pointer animate-in slide-in-from-bottom-2",
            t.kind === "error"
              ? "bg-danger text-white"
              : t.kind === "success"
                ? "bg-success text-white"
                : "bg-surface2 text-ink border border-line",
          )}>
          {t.text}
        </div>
      ))}
    </div>
  );
}
