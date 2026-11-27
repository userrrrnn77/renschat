// src/pages/StaticPages.tsx
import "./public-page-motion.css";
import { Link, useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
import { SparkleLogo } from "../components/ui/Icons";
import { useTranslation } from "react-i18next";
import { useSeo, defaultJsonLd } from "../lib/seo";

interface LegalLayoutProps {
  title: string;
  contentHtml: string;
  canonicalPath: string;
}

function LegalLayout({ title, contentHtml }: LegalLayoutProps) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  return (
    <div className="h-screen overflow-y-auto bg-bg">
      <nav className="sticky top-0 z-50 bg-bg/80 backdrop-blur-xl border-b border-line">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <SparkleLogo className="w-5 h-5 text-accent" />
            <span className="font-semibold text-ink">RensChat</span>
          </Link>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-muted hover:text-ink transition-colors">
            <ArrowLeft className="w-4 h-4" />
            {t("static.back")}
          </button>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12 md:py-20 rens-page-enter">
        <h1 className="text-3xl md:text-4xl font-semibold text-ink mb-4">
          {title}
        </h1>
        <p className="text-muted mb-10 pb-6 border-b border-line">
          {t("static.updated")}{" "}
          {new Date().toLocaleDateString(
            i18n.language === "id" ? "id-ID" : "en-US",
            { day: "numeric", month: "long", year: "numeric" },
          )}
        </p>
        <div
          className="prose-chat max-w-none text-muted"
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
      </main>
    </div>
  );
}

export function TermsPage() {
  const { t, i18n } = useTranslation();
  useSeo({
    title: `${t("static.terms.title")} · RensChat`,
    description:
      i18n.language === "id"
        ? "Syarat dan ketentuan penggunaan RensChat: aturan layanan, batasan tanggung jawab, media AI, retensi 24 jam, dan donasi opsional."
        : "RensChat terms of service: usage rules, limitations of liability, AI media, 24-hour retention, and optional donations.",
    path: "/terms",
    lang: i18n.language === "en" ? "en" : "id",
  });
  return (
    <LegalLayout
      title={t("static.terms.title")}
      contentHtml={t("static.terms.content")}
      canonicalPath="/terms"
    />
  );
}

export function PrivacyPage() {
  const { t, i18n } = useTranslation();
  useSeo({
    title: `${t("static.privacy.title")} · RensChat`,
    description:
      i18n.language === "id"
        ? "Kebijakan privasi RensChat: data yang dikumpulkan, penggunaan, keamanan, data donasi, dan cara menghapus data Anda."
        : "RensChat privacy policy: collected data, usage, security, donation data, and how to delete your data.",
    path: "/privacy",
    lang: i18n.language === "en" ? "en" : "id",
  });
  return (
    <LegalLayout
      title={t("static.privacy.title")}
      contentHtml={t("static.privacy.content")}
      canonicalPath="/privacy"
    />
  );
}

export function FaqPage() {
  const { t, i18n } = useTranslation();

  const faqGraph = defaultJsonLd()["@graph"] as unknown[];
  const faqPage = {
    "@type": "FAQPage",
    "@id": "https://renschat.web.id/faq#faqpage",
    inLanguage: i18n.language === "en" ? "en-US" : "id-ID",
    mainEntity: [
      {
        "@type": "Question",
        name: "What is RensChat?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "RensChat is an AI assistant that not only replies with text but can also render interactive tables, charts, cards, create files, and generate images and videos directly within the chat.",
        },
      },
      {
        "@type": "Question",
        name: "Is my data safe?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. RensChat uses secure JWT authentication and files are stored in private Cloudflare R2 storage. Chat history stays tied to your account only.",
        },
      },
      {
        "@type": "Question",
        name: "Is AI image generation free?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Image generation with FLUX.2 Klein is available from the composer toolbar. Video generation and FLUX.3 image models are currently disabled by the backend (MEDIA_DISABLED).",
        },
      },
      {
        "@type": "Question",
        name: "How long is generated media stored?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "All generated media is stored for a maximum of 24 hours from creation, then automatically deleted. Download any media you need before it expires.",
        },
      },
      {
        "@type": "Question",
        name: "Is AI-generated media legal to use?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Images generated by FLUX.2 Klein follow the FLUX Kommunity License v1.0. Existing Cosmos videos follow NVIDIA API Trial Terms. Legacy media generated before the current backend contract may still include the SynthID watermark.",
        },
      },
      {
        "@type": "Question",
        name: "What AI models power RensChat?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Image generation currently uses FLUX.2 Klein. Video and FLUX.3 image models are not currently available. The frontend only advertises models returned by the backend capability endpoint.",
        },
      },
      {
        "@type": "Question",
        name: "What file formats are supported?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "RensChat supports PDF, DOCX, XLSX, CSV, TXT, Markdown, JSON, and images (PNG, JPG). Generated media output is PNG/JPEG/WebP images and MP4 videos.",
        },
      },
    ],
  };

  useSeo({
    title: `${t("static.faq.title")} · RensChat`,
    description:
      i18n.language === "id"
        ? "Jawaban singkat untuk pertanyaan umum tentang RensChat: fitur, keamanan, format file, media AI, donasi, dan cara kerja RAG."
        : "Short answers to common questions about RensChat: features, security, file formats, AI media, donations, and how RAG works.",
    path: "/faq",
    lang: i18n.language === "en" ? "en" : "id",
    jsonLd: {
      "@context": "https://schema.org",
      "@graph": [...faqGraph, faqPage],
    },
  });

  return (
    <LegalLayout
      title={t("static.faq.title")}
      contentHtml={t("static.faq.content")}
      canonicalPath="/faq"
    />
  );
}

export function ContactPage() {
  const { t, i18n } = useTranslation();
  useSeo({
    title: `${t("static.contact.title")} · RensChat`,
    description:
      i18n.language === "id"
        ? "Hubungi tim RensChat untuk bantuan, masukan, atau laporan bug. Email support developer@renschat.web.id."
        : "Contact the RensChat team for support, feedback, or bug reports. Email developer@renschat.web.id.",
    path: "/contact",
    lang: i18n.language === "en" ? "en" : "id",
  });
  return (
    <LegalLayout
      title={t("static.contact.title")}
      contentHtml={`
      <p class="mb-6">${t("static.contact.desc")}</p>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 not-prose">
        <div class="p-6 bg-surface border border-line rounded-xl">
          <h3 class="font-semibold text-ink mb-2 flex items-center gap-2">
            <span class="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-mail"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
            </span>
            ${t("static.contact.support")}
          </h3>
          <p class="text-sm text-muted mb-4">${t("static.contact.supportDesc")}</p>
          <a href="mailto:developer@renschat.web.id" class="text-sm font-medium text-accent hover:underline">developer@renschat.web.id</a>
        </div>
        <div class="p-6 bg-surface border border-line rounded-xl">
          <h3 class="font-semibold text-ink mb-2 flex items-center gap-2">
            <span class="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bug"><path d="m8 2 1.88 1.88"/><path d="M14.12 3.88 16 2"/><path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6"/><path d="M12 20v-9"/><path d="M6.53 9C4.6 8.8 3 7.1 3 5"/><path d="M6 13H2"/><path d="M3 21c0-2.1 1.7-3.9 3.8-4"/><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4"/><path d="M22 13h-4"/><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4"/></svg>
            </span>
            ${t("static.contact.bug")}
          </h3>
          <p class="text-sm text-muted mb-4">${t("static.contact.bugDesc")}</p>
          <a href="mailto:developer@renschat.web.id" class="text-sm font-medium text-accent hover:underline">developer@renschat.web.id</a>
        </div>
      </div>
    `}
      canonicalPath="/contact"
    />
  );
}
