'use client';

import { useEffect } from 'react';

import { registerServiceWorker } from '@/lib/sw';

/** Đăng ký service worker cho toàn app. Đặt ở root layout, không render gì. */
export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    void registerServiceWorker();
  }, []);
  return null;
}
