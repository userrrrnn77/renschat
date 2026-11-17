import { SparkleLogo } from "../ui/Icons";
import { useAuthStore } from "../../store/authStore";
import { useComposerStore } from "../../store/composerStore";
import { useTranslation } from "react-i18next";

export function EmptyState({ sessionId = "new" }: { sessionId?: string }) {
  const { t } = useTranslation();

  const user = useAuthStore((s) => s.user);
  const setText = useComposerStore((s) => s.setText);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h >= 5 && h < 11) return t("chat.greetingMorning");
    if (h >= 11 && h < 15) return t("chat.greetingAfternoon");
    if (h >= 15 && h < 18) return t("chat.greetingEvening");
    return t("chat.greetingNight");
  };

  const firstName = user?.name?.split(" ")[0] || t("chat.guest");

  const suggestions = [
    {
      label: t("chat.suggestions.tableLabel"),
      prompt: t("chat.suggestions.tablePrompt"),
    },
    {
      label: t("chat.suggestions.chartLabel"),
      prompt: t("chat.suggestions.chartPrompt"),
    },
    {
      label: t("chat.suggestions.codeLabel"),
      prompt: t("chat.suggestions.codePrompt"),
    },
    {
      label: t("chat.suggestions.pdfLabel"),
      prompt: t("chat.suggestions.pdfPrompt"),
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-4 md:px-8 text-center animate-in fade-in zoom-in-95 duration-500">
      <div className="mb-6 flex flex-col items-center gap-4">
        <SparkleLogo className="w-10 h-10 text-accent" />
        <h1 className="text-3xl md:text-4xl font-serif font-medium text-ink">
          {getGreeting()}, {firstName}
        </h1>
      </div>
      <p className="text-muted text-sm max-w-md mb-8">{t("chat.emptyDesc")}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-xl">
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => setText(sessionId, s.prompt)}
            className="p-3 text-left border border-line rounded-xl bg-surface hover:bg-surface2 hover:border-accent/30 transition-all text-sm font-medium text-ink">
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
