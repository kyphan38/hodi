// ============================================================
// hodi - Đăng ký service worker (chép từ fina/src/lib/sw.ts)
//
// Không import gì, cố ý: cache app-shell quyết định app mở nhanh hay chậm,
// không được phụ thuộc vào SDK nào khác.
// Chỉ đăng ký ở bản build: ở dev, cache-first sẽ giữ code cũ và gây khó hiểu.
// ============================================================

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  if (process.env.NODE_ENV !== 'production') return null;
  try {
    return await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  } catch {
    // Safari private mode và một vài ngữ cảnh khác từ chối. App vẫn chạy.
    return null;
  }
}
