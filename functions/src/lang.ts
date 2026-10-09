// Reply language for AI text. Prompts stay in English; only the answer changes.
// Pure file: the root test suite imports it.

export type Lang = 'vi' | 'en';

export function parseLang(raw: unknown): Lang {
  return raw === 'en' ? 'en' : 'vi';
}

export function replyLanguageRule(lang: Lang): string {
  return lang === 'en'
    ? 'Reply in simple, plain English.'
    : 'Reply in natural, simple Vietnamese with full diacritics. Do not mix in English words.';
}
