'use client';

import { useEffect } from 'react';

/**
 * Blurs the whole page when the app is hidden, so the iPhone app switcher
 * snapshot shows no journal. Follows visibilitychange only (not blur): on a
 * Mac, fading the page on every window switch would be annoying.
 */
export default function PrivacyVeil() {
  useEffect(() => {
    const root = document.documentElement;
    const sync = () => root.classList.toggle('veiled', document.visibilityState === 'hidden');
    const hide = () => root.classList.add('veiled');
    const show = () => root.classList.remove('veiled');
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('pagehide', hide);
    window.addEventListener('pageshow', show);
    return () => {
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('pagehide', hide);
      window.removeEventListener('pageshow', show);
    };
  }, []);
  return null;
}
