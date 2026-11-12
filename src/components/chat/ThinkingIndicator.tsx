import { SparkleLogo } from "../ui/Icons";

export function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-2 text-muted py-2 animate-pulse">
      <SparkleLogo className="w-4 h-4 text-accent" />
      <span className="text-sm font-medium">Berpikir…</span>
    </div>
  );
}
