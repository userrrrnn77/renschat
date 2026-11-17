import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const next = i18n.language === "en" ? "id" : "en";
    i18n.changeLanguage(next);
    document.documentElement.lang = next;
  };

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-surface2 text-muted hover:text-ink transition-colors"
      title={
        i18n.language === "en"
          ? "Switch to Indonesian"
          : "Ganti ke Bahasa Inggris"
      }>
      <Globe className="w-4 h-4" />
    </button>
  );
}
