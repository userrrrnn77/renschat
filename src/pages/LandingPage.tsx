// src/pages/LandingPage.tsx
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import {
  Sparkles,
  Table as TableIcon,
  BarChart3,
  FileText,
  Image as ImageIcon,
  Video,
  ShieldCheck,
} from "lucide-react";
import { SparkleLogo } from "../components/ui/Icons";
import { useSeo } from "../lib/seo";

export function LandingPage() {
  const { t, i18n } = useTranslation();

  useSeo({
    title: t("landing.seo.title"),
    description: t("landing.seo.description"),
    path: "/",
    type: "website",
    lang: i18n.language === "en" ? "en" : "id",
  });

  const features = [
    { icon: TableIcon, key: "table" },
    { icon: BarChart3, key: "chart" },
    { icon: FileText, key: "file" },
    { icon: ImageIcon, key: "image" },
    { icon: Video, key: "video" },
    { icon: ShieldCheck, key: "rag" },
  ] as const;

  return (
    <div className="h-screen overflow-y-auto bg-bg text-ink">
      <header className="sticky top-0 z-40 bg-bg/80 backdrop-blur-xl border-b border-line">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <SparkleLogo className="w-5 h-5 text-accent" />
            <span className="font-semibold">RensChat</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link
              to="/faq"
              className="text-muted hover:text-ink transition-colors">
              {t("menu.faq")}
            </Link>
            <Link
              to="/contact"
              className="hidden sm:inline text-muted hover:text-ink transition-colors">
              {t("static.contact.title")}
            </Link>
            <Link
              to="/login"
              className="px-4 py-2 bg-accent text-accent-fg rounded-lg font-medium hover:bg-accent-hover transition-colors">
              {t("landing.ctaLogin")}
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="max-w-6xl mx-auto px-4 md:px-6 pt-16 md:pt-24 pb-12 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-accent/10 text-accent rounded-full text-xs font-medium mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            {t("landing.badge")}
          </div>
          <h1 className="text-3xl md:text-5xl font-semibold tracking-tight mb-4 max-w-3xl mx-auto">
            {t("landing.heroTitle")}
          </h1>
          <p className="text-muted md:text-lg max-w-2xl mx-auto mb-8">
            {t("landing.heroSubtitle")}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/login"
              className="px-6 py-3 bg-accent text-accent-fg rounded-lg font-medium hover:bg-accent-hover transition-colors">
              {t("landing.ctaPrimary")}
            </Link>
            <Link
              to="/faq"
              className="px-6 py-3 border border-line rounded-lg font-medium text-ink hover:bg-surface2 transition-colors">
              {t("landing.ctaSecondary")}
            </Link>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 md:px-6 py-12">
          <h2 className="text-2xl md:text-3xl font-semibold mb-8 text-center">
            {t("landing.featuresTitle")}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map(({ icon: Icon, key }) => (
              <article
                key={key}
                className="p-5 bg-surface border border-line rounded-xl">
                <Icon className="w-5 h-5 text-accent mb-3" aria-hidden="true" />
                <h3 className="font-medium mb-1">
                  {t(`landing.features.${key}.title`)}
                </h3>
                <p className="text-sm text-muted">
                  {t(`landing.features.${key}.desc`)}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 md:px-6 py-12">
          <div className="bg-surface border border-line rounded-2xl p-6 md:p-10">
            <h2 className="text-2xl md:text-3xl font-semibold mb-3">
              {t("landing.techTitle")}
            </h2>
            <p className="text-muted mb-4 max-w-3xl">{t("landing.techDesc")}</p>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted">
              <li>• {t("landing.techFact1")}</li>
              <li>• {t("landing.techFact2")}</li>
              <li>• {t("landing.techFact3")}</li>
              <li>• {t("landing.techFact4")}</li>
            </ul>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 md:px-6 py-12 text-center">
          <p className="text-sm text-muted">
            {t("landing.learnMore")}{" "}
            <Link to="/faq" className="text-accent hover:underline">
              {t("menu.faq")}
            </Link>
            {", "}
            <Link to="/terms" className="text-accent hover:underline">
              {t("menu.terms")}
            </Link>
            {", "}
            <Link to="/privacy" className="text-accent hover:underline">
              {t("menu.privacy")}
            </Link>
            {", "}
            <Link to="/contact" className="text-accent hover:underline">
              {t("static.contact.title")}
            </Link>
            .
          </p>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted">
          <div className="flex items-center gap-2">
            <SparkleLogo className="w-4 h-4 text-accent" />
            <span>© {new Date().getFullYear()} RensChat</span>
          </div>
          <nav className="flex flex-wrap gap-4">
            <Link to="/terms" className="hover:text-ink">
              {t("menu.terms")}
            </Link>
            <Link to="/privacy" className="hover:text-ink">
              {t("menu.privacy")}
            </Link>
            <Link to="/faq" className="hover:text-ink">
              {t("menu.faq")}
            </Link>
            <Link to="/contact" className="hover:text-ink">
              {t("static.contact.title")}
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
