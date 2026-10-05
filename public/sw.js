// ============================================================
// hodi - Service worker
//
// Dựa trên fina/noda (public/sw.js) nhưng khác một điểm có chủ ý:
// HTML là stale-while-revalidate, không phải network-first.
//
// hodi là web tĩnh, mọi dữ liệu nằm ở Firestore (có cache riêng). Nên HTML
// cũ một bản build vẫn đúng - chỉ là giao diện của lần build trước. Đổi lại:
// mở app là có trang ngay, kể cả mạng yếu hay mất mạng. Bản build mới được
// tải ngầm và dùng ở lần mở sau.
//
// /_next/static/*  cache-first vĩnh viễn (tên file có hash nội dung).
// HTML             stale-while-revalidate, khoá cache bỏ query (?d=…).
// Firestore/Auth   KHÔNG đụng vào (khác origin, hoặc /__/).
//
// Lúc cài: tải sẵn mọi trang + toàn bộ JS/CSS mà các trang đó cần, để lần
// đầu mất mạng mà bấm sang Days vẫn chạy được.
// ============================================================

const CACHE_VERSION = 'hodi-v1';
const PAGES = ['/', '/days/', '/day/', '/review/', '/settings/', '/login/'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(precache());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function precache() {
  const cache = await caches.open(CACHE_VERSION);
  const assets = new Set(['/favicon.svg', '/branding/hodi-icon.svg', '/manifest.webmanifest']);
  await Promise.all(
    PAGES.map(async (path) => {
      try {
        const res = await fetch(path, { cache: 'no-cache' });
        if (!res.ok) return;
        const html = await res.clone().text();
        await cache.put(path, res);
        for (const m of html.matchAll(/["'(](\/_next\/static\/[^"'()\s]+)/g)) assets.add(m[1]);
      } catch {
        // Mất mạng lúc cài: lần sau thử lại.
      }
    }),
  );
  await Promise.all(
    [...assets].map((url) =>
      cache.match(url).then((hit) => hit || fetch(url).then((r) => r.ok && cache.put(url, r)).catch(() => {})),
    ),
  );
}

function isStatic(url) {
  return url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/');
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/__/')) return;

  if (isStatic(url)) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }

  if (req.mode === 'navigate') {
    const key = url.pathname;
    event.respondWith(
      caches.open(CACHE_VERSION).then(async (cache) => {
        const hit = await cache.match(key);
        const fresh = fetch(req)
          .then((res) => {
            if (res.ok) cache.put(key, res.clone());
            return res;
          })
          .catch(() => null);
        if (hit) {
          event.waitUntil(fresh);
          return hit;
        }
        return (await fresh) || (await cache.match('/')) || Response.error();
      }),
    );
  }
});
