// src/lib/sanitizeAssistantText.ts

const BLOCK_PATTERNS: RegExp[] = [
  /<tool_calls?>[\s\S]*?<\/tool_calls?>/gi,
  /<function=[^>]*>[\s\S]*?<\/function>/gi,
  /<parameter=[^>]*>[\s\S]*?<\/parameter>/gi,
];

const ORPHAN_TAG_PATTERNS: RegExp[] = [
  /<\/?tool_calls?>/gi,
  /<function=[^>]*>/gi,
  /<\/function>/gi,
  /<parameter=[^>]*>/gi,
  /<\/parameter>/gi,
  /<\|[^|]*\|>/g,
];

/**
 * Membersihkan teks asisten dari artefak internal: raw tool-call XML,
 * tag function/parameter, dan special token model. Dipakai sebelum
 * teks dirender ke user (defense-in-depth; backend juga sudah menyaring).
 */
export function sanitizeAssistantText(input: string): string {
  let s = input;
  for (const re of BLOCK_PATTERNS) s = s.replace(re, " ");
  for (const re of ORPHAN_TAG_PATTERNS) s = s.replace(re, " ");
  s = s.replace(/[ \t]+\n/g, "\n");
  s = s.replace(/\n{3,}/g, "\n\n");
  s = s.replace(/[ \t]{2,}/g, " ");
  return s.trim();
}

const SECRET_PATTERNS: Array<[RegExp, string]> = [
  [/\bsk-[A-Za-z0-9_-]{8,}\b/g, "[disembunyikan]"],
  [/\bnvapi-[A-Za-z0-9_-]{8,}\b/g, "[disembunyikan]"],
  [/\bBearer\s+[A-Za-z0-9._-]{8,}/gi, "Bearer [disembunyikan]"],
  [
    /\b(?:api[_-]?key|access[_-]?token|secret|password)\s*[:=]\s*["']?[A-Za-z0-9._-]{6,}["']?/gi,
    "[disembunyikan]",
  ],
  [/\bhttps?:\/\/[^\s]*nvidia[^\s]*/gi, "[disembunyikan]"],
  [/\bat\s+[^\s()]+\s*\([^)]*:\d+:\d+\)/g, ""],
  [/\b(?:node|bun):internal\/[^\s]+/gi, ""],
];

/**
 * Menyiapkan pesan error agar aman ditampilkan ke user: buang stack trace,
 * API key, URL provider, dan detail konfigurasi.
 */
export function redactForUser(input: string, maxLen = 400): string {
  let s = sanitizeAssistantText(input);
  for (const [re, replacement] of SECRET_PATTERNS)
    s = s.replace(re, replacement);
  s = s.replace(/\s{2,}/g, " ").trim();
  if (s.length > maxLen) s = `${s.slice(0, maxLen).trimEnd()}…`;
  return s;
}
