// ============================================================
// hodi - Tuỳ chọn hiển thị (lưu theo máy, localStorage)
//
// Theme và cỡ chữ phải có TRƯỚC khi vẽ trang, nên đọc bằng script inline
// trong <head> (THEME_SCRIPT) chứ không chờ React. Firestore thì quá muộn.
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

/** Màu thanh trạng thái (theme-color) - khớp --bg trong globals.css. */
export const BG_LIGHT = '#fafafa';
export const BG_DARK = '#111111';

/** Áp theme/cỡ chữ lên <html>. Gọi khi người dùng đổi trong Settings. */
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
 * Chạy đồng bộ trong <head>, trước lần vẽ đầu tiên - không nháy trắng ở dark
 * mode, không nhảy cỡ chữ. Viết tay bằng ES5 vì nó không qua bundler.
 */
export const THEME_SCRIPT = `(function(){try{
var t=localStorage.getItem('hodi.theme'),s=localStorage.getItem('hodi.size'),r=document.documentElement;
if(t==='light'||t==='dark')r.setAttribute('data-theme',t);
r.setAttribute('data-size',s==='s'||s==='l'?s:'m');
}catch(e){}})();`;
