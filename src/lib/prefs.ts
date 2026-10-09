// ============================================================
// hodi - Display options (per device, localStorage)
//
// Theme and text size must exist BEFORE the first paint, so an inline script
// in <head> (THEME_SCRIPT) reads them instead of waiting for React. Firestore
// would be too late.
// ============================================================

import { stringStore } from '@/lib/store';

export type Theme = 'system' | 'light' | 'dark';
export type TextSize = 's' | 'm' | 'l';

const oneOf =
  <T extends string>(values: readonly T[]) =>
  (raw: string): T | null =>
    (values as readonly string[]).includes(raw) ? (raw as T) : null;

export const themeStore = stringStore<Theme>('hodi.theme', 'system', oneOf(['system', 'light', 'dark']));
export const sizeStore = stringStore<TextSize>('hodi.size', 'm', oneOf(['s', 'm', 'l']));
export const questionsStore = stringStore<'on' | 'off'>('hodi.questions', 'on', oneOf(['on', 'off']));
export const typewriterStore = stringStore<'on' | 'off'>('hodi.typewriter', 'off', oneOf(['on', 'off']));
export type AiLang = 'vi' | 'en';
// Off by default: AI sends journal text to Gemini, so it must be a clear choice.
export const aiStore = stringStore<'on' | 'off'>('hodi.ai', 'off', oneOf(['on', 'off']));
export const aiLangStore = stringStore<AiLang>('hodi.aiLang', 'vi', oneOf(['vi', 'en']));

/** Status bar color (theme-color) - matches --bg in globals.css. */
export const BG_LIGHT = '#fafafa';
export const BG_DARK = '#111111';

/** Applies theme/text size to <html>. Called when the user changes them in Settings. */
export function applyDisplayPrefs(theme: Theme, size: TextSize): void {
  const root = document.documentElement;
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
  root.setAttribute('data-size', size);
  const dark =
    theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((m) => m.setAttribute('content', dark ? BG_DARK : BG_LIGHT));
}

/**
 * Runs synchronously in <head>, before the first paint - no white flash in dark
 * mode, no text size jump. Handwritten ES5 because it skips the bundler.
 */
export const THEME_SCRIPT = `(function(){try{
var t=localStorage.getItem('hodi.theme'),s=localStorage.getItem('hodi.size'),r=document.documentElement;
if(t==='light'||t==='dark')r.setAttribute('data-theme',t);
r.setAttribute('data-size',s==='s'||s==='l'?s:'m');
}catch(e){}})();`;
