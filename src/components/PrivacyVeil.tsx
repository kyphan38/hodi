'use client';

import { useEffect } from 'react';

/**
 * Làm mờ cả trang khi app bị ẩn, để ảnh chụp ở màn hình đổi app của iPhone
 * không lộ nhật ký. Chỉ theo visibilitychange (không theo blur): trên Mac,
 * chuyển cửa sổ mà trang mờ đi mỗi lần thì rất phiền.
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
