import hljs from "highlight.js/lib/common";

export const highlightCode = (code: string, lang: string) => {
  if (lang && hljs.getLanguage(lang)) {
    try {
      return hljs.highlight(code, { language: lang }).value;
    } catch {}
  }
  return hljs.highlightAuto(code).value;
};
