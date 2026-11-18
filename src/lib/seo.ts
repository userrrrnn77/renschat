// src/lib/seo.ts
import { useEffect } from "react";

const SITE_URL = "https://renschat.web.id";
const SITE_NAME = "RensChat";
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;

export interface SeoInput {
  title: string;
  description: string;
  path: string;
  image?: string;
  type?: "website" | "article";
  noindex?: boolean;
  lang?: string;
  jsonLd?: Record<string, unknown>;
}

function ensureMetaByName(name: string): HTMLMetaElement {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  return el;
}

function ensureMetaByProperty(property: string): HTMLMetaElement {
  let el = document.head.querySelector<HTMLMetaElement>(
    `meta[property="${property}"]`,
  );
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("property", property);
    document.head.appendChild(el);
  }
  return el;
}

function ensureCanonical(): HTMLLinkElement {
  let el = document.head.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]',
  );
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  return el;
}

const JSON_LD_ID = "seo-json-ld";

function setJsonLd(data: Record<string, unknown> | undefined): void {
  const existing = document.getElementById(JSON_LD_ID);
  if (existing) existing.remove();
  if (!data) return;
  const script = document.createElement("script");
  script.id = JSON_LD_ID;
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}

export function defaultJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: `${SITE_URL}/`,
        logo: {
          "@type": "ImageObject",
          url: `${SITE_URL}/favicon.ico`,
        },
        email: "developer@renschat.web.id",
        description:
          "RensChat is a generative AI assistant that renders text, code, tables, charts, cards, files, images, and video directly in chat.",
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: `${SITE_URL}/`,
        name: SITE_NAME,
        publisher: { "@id": `${SITE_URL}/#organization` },
        inLanguage: ["id-ID", "en-US"],
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${SITE_URL}/#software`,
        name: SITE_NAME,
        applicationCategory: "ProductivityApplication",
        operatingSystem: "Web",
        url: `${SITE_URL}/`,
        image: DEFAULT_IMAGE,
        description:
          "Generative AI assistant with interactive tables, charts, files, image and video generation. Core features are free; optional donation unlocks heavier media models.",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        publisher: { "@id": `${SITE_URL}/#organization` },
        inLanguage: ["id-ID", "en-US"],
      },
    ],
  };
}

function applySeo(input: SeoInput): void {
  const url = `${SITE_URL}${input.path}`;
  const image = input.image ?? DEFAULT_IMAGE;

  document.title = input.title;

  ensureMetaByName("description").setAttribute("content", input.description);
  ensureMetaByName("robots").setAttribute(
    "content",
    input.noindex ? "noindex, nofollow" : "index, follow",
  );
  ensureCanonical().setAttribute("href", url);

  ensureMetaByProperty("og:title").setAttribute("content", input.title);
  ensureMetaByProperty("og:description").setAttribute(
    "content",
    input.description,
  );
  ensureMetaByProperty("og:url").setAttribute("content", url);
  ensureMetaByProperty("og:type").setAttribute(
    "content",
    input.type ?? "website",
  );
  ensureMetaByProperty("og:image").setAttribute("content", image);
  ensureMetaByProperty("og:site_name").setAttribute("content", SITE_NAME);

  ensureMetaByName("twitter:card").setAttribute(
    "content",
    "summary_large_image",
  );
  ensureMetaByName("twitter:title").setAttribute("content", input.title);
  ensureMetaByName("twitter:description").setAttribute(
    "content",
    input.description,
  );
  ensureMetaByName("twitter:image").setAttribute("content", image);

  if (input.lang) {
    document.documentElement.setAttribute("lang", input.lang);
  }

  setJsonLd(input.jsonLd ?? defaultJsonLd());
}

export function useSeo(input: SeoInput): void {
  useEffect(() => {
    applySeo(input);
  }, [
    input.title,
    input.description,
    input.path,
    input.image,
    input.type,
    input.noindex,
    input.lang,
    input.jsonLd,
  ]);
}

export const SEO_SITE = {
  url: SITE_URL,
  name: SITE_NAME,
  defaultImage: DEFAULT_IMAGE,
};
