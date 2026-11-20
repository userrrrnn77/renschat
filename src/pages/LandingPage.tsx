import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { SparkleLogo } from "../components/ui/Icons";
import { useSeo } from "../lib/seo";

const originalCode = `const qty = 0;
const display = qty || "N/A";`;

const fixedCode = `const display = qty ?? "N/A";`;

const footerLinks = [
  { to: "/faq", label: "menu.faq" },
  { to: "/contact", label: "static.contact.title" },
  { to: "/terms", label: "menu.terms" },
  { to: "/privacy", label: "menu.privacy" },
] as const;

const textLink =
  "inline-flex min-h-10 items-center rounded-sm underline-offset-4 hover:underline active:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent";

const codeBlock =
  "my-5 whitespace-pre-wrap wrap-anywhere font-mono text-sm leading-7 sm:text-base";

export function LandingPage() {
  const { t, i18n } = useTranslation();

  useSeo({
    title: t("landing.seo.title"),
    description: t("landing.seo.description"),
    path: "/",
    type: "website",
    lang: i18n.resolvedLanguage ?? i18n.language,
  });

  return (
    <div className="h-dvh overflow-y-auto bg-bg text-ink">
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between gap-4 border-b border-line py-3">
          <Link
            to="/"
            className={`${textLink} gap-2 font-semibold tracking-tight`}>
            <span aria-hidden="true">
              <SparkleLogo className="size-5" />
            </span>
            {t("landing.brand")}
          </Link>

          <Link to="/login" className={`${textLink} text-sm font-medium`}>
            {t("landing.ctaLogin")}
          </Link>
        </header>

        <main>
          <section
            aria-labelledby="landing-title"
            className="grid items-center gap-9 py-12 sm:py-16 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:py-28">
            <div className="min-w-0">
              <h1
                id="landing-title"
                className="max-w-[12ch] text-balance text-5xl leading-[1.03] font-semibold tracking-tighter sm:text-6xl lg:text-7xl">
                {t("landing.heroTitle")}
              </h1>

              <p className="mt-5 max-w-[42ch] text-base leading-7 text-muted sm:text-lg sm:leading-8">
                {t("landing.heroSubtitle")}
              </p>

              <Link
                to="/login"
                className="mt-7 inline-flex min-h-11 items-center justify-center rounded-md bg-ink px-5 py-2.5 text-sm font-semibold text-bg underline-offset-4 hover:underline active:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">
                {t("landing.ctaPrimary")}
              </Link>
            </div>

            <figure className="min-w-0 border-s-[3px] border-accent bg-surface2 p-5 sm:p-7">
              <figcaption className="text-sm font-medium">
                {t("landing.example.caption")}
              </figcaption>

              <pre className={codeBlock}>
                <code>{originalCode}</code>
              </pre>

              <p className="text-sm leading-6">{t("landing.example.result")}</p>

              <details className="mt-5 border-t border-line">
                <summary className="cursor-pointer rounded-sm py-3 text-sm font-semibold underline-offset-4 hover:underline active:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
                  {t("landing.example.showFix")}
                </summary>

                <pre className={codeBlock}>
                  <code>{fixedCode}</code>
                </pre>

                <p className="text-sm leading-6">
                  {t("landing.example.explanation")}
                </p>
              </details>
            </figure>
          </section>

          <section
            aria-labelledby="landing-work-title"
            className="grid gap-7 border-t border-line py-10 sm:py-14 lg:grid-cols-[1fr_1.2fr] lg:gap-16">
            <div>
              <h2
                id="landing-work-title"
                className="max-w-[18ch] text-balance text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
                {t("landing.work.title")}
              </h2>

              <p className="mt-3 max-w-[40ch] leading-7 text-muted">
                {t("landing.work.description")}
              </p>
            </div>

            <dl className="divide-y divide-line">
              {(["finance", "reports", "meetings"] as const).map((key) => (
                <div key={key} className="py-4 first:pt-0 last:pb-0">
                  <dt className="font-semibold">
                    {t(`landing.work.${key}.title`)}
                  </dt>
                  <dd className="mt-1 max-w-[58ch] text-sm leading-6 text-muted">
                    {t(`landing.work.${key}.example`)}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <aside className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-y border-line py-4 text-sm leading-6">
            <strong className="font-medium">{t("landing.video.status")}</strong>
            <span className="text-muted">{t("landing.video.formats")}</span>
          </aside>
        </main>

        <footer className="flex flex-col gap-2 py-5 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <span>
            {t("landing.copyright", { year: new Date().getFullYear() })}
          </span>

          <nav
            aria-label={t("landing.footerNav")}
            className="flex flex-wrap items-center gap-x-5">
            {footerLinks.map(({ to, label }) => (
              <Link key={to} to={to} className={textLink}>
                {t(label)}
              </Link>
            ))}
          </nav>
        </footer>
      </div>
    </div>
  );
}
