import { ChartColumn, Code2, FileText, Table2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../store/authStore";
import { useComposerStore } from "../../store/composerStore";
import { SparkleLogo } from "../ui/Icons";

export function EmptyState() {
  const { t } = useTranslation();
  const name = useAuthStore((s) => s.user?.name?.trim().split(/\s+/)[0]);

  const hour = new Date().getHours();
  let greeting = "chat.greetingNight";

  if (hour >= 5 && hour < 11) greeting = "chat.greetingMorning";
  else if (hour >= 11 && hour < 15) greeting = "chat.greetingAfternoon";
  else if (hour >= 15 && hour < 18) greeting = "chat.greetingEvening";

  return (
    <header className="flex items-center justify-center gap-3 text-center">
      <SparkleLogo className="size-8 shrink-0 text-accent sm:size-10" />
      <h1 className="min-w-0 wrap-break-word font-serif text-3xl leading-tight tracking-tight text-ink sm:text-5xl">
        {t(greeting)}, {name || t("chat.guest")}
      </h1>
    </header>
  );
}

const starters = [
  { key: "table", icon: Table2 },
  { key: "chart", icon: ChartColumn },
  { key: "code", icon: Code2 },
  { key: "pdf", icon: FileText },
] as const;

export function StarterPrompts({ sessionId }: { sessionId: string }) {
  const { t } = useTranslation();
  const setText = useComposerStore((s) => s.setText);

  return (
    <div className="flex flex-wrap justify-center gap-2">
      {starters.map(({ key, icon: Icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => {
            setText(sessionId, t(`chat.suggestions.${key}Prompt`));

            if (window.matchMedia("(pointer: fine)").matches) {
              document.getElementById(`composer-${sessionId}`)?.focus();
            }
          }}
          className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-2 text-xs text-muted transition-colors hover:border-accent/40 hover:bg-surface2 hover:text-ink focus-visible:outline-accent">
          <Icon aria-hidden="true" className="size-3.5" />
          {t(`chat.suggestions.${key}Label`)}
        </button>
      ))}
    </div>
  );
}
