// ============================================================
// hodi - Firebase client SDK (chỉ chạy trên trình duyệt)
//
// Khác fina: khởi tạo LƯỜI (gọi hàm mới tạo), không ném lỗi lúc import.
// hodi là web tĩnh - mọi trang được prerender lúc build, và lúc đó module này
// vẫn bị nạp. Ném lỗi ở top-level sẽ làm hỏng build khi thiếu env.
//
// NEXT_PUBLIC_USE_EMULATORS=1 (npm run dev:emu) nối vào Auth/Firestore
// emulator với project giả 'demo-hodi' - chạy được mà không cần project thật.
// ============================================================

import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import {
  connectFirestoreEmulator,
  getFirestore,
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';

export const USE_EMULATORS = process.env.NEXT_PUBLIC_USE_EMULATORS === '1';

// Next.js chỉ inline được biến NEXT_PUBLIC_* khi viết đầy đủ, không destructure.
const realConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const emulatorConfig = {
  apiKey: 'demo-key',
  authDomain: 'demo-hodi.firebaseapp.com',
  projectId: 'demo-hodi',
  appId: 'demo-app',
};

/** Thiếu biến env nào (rỗng = đủ). Màn hình login dùng để báo lỗi rõ ràng. */
export function missingConfig(): string[] {
  if (USE_EMULATORS) return [];
  return Object.entries(realConfig)
    .filter(([, v]) => !v)
    .map(([k]) => k);
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

function getFirebaseApp(): FirebaseApp {
  if (app) return app;
  const missing = missingConfig();
  if (missing.length > 0) {
    throw new Error(`[firebase] Missing env: ${missing.join(', ')}. See .env.example.`);
  }
  app = getApps().length ? getApp() : initializeApp(USE_EMULATORS ? emulatorConfig : realConfig);
  return app;
}

export function getAuthClient(): Auth {
  if (auth) return auth;
  auth = getAuth(getFirebaseApp());
  if (USE_EMULATORS) connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  return auth;
}

export function getDb(): Firestore {
  if (db) return db;
  const firebase = getFirebaseApp();
  try {
    // Offline-first: viết được khi mất sóng, tự sync khi có mạng lại.
    db = initializeFirestore(firebase, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch (err) {
    // Safari private mode chặn IndexedDB → cache trong RAM.
    console.warn('[firebase] persistent cache unavailable, using memory cache', err);
    try {
      db = initializeFirestore(firebase, { localCache: memoryLocalCache() });
    } catch {
      db = getFirestore(firebase);
    }
  }
  if (USE_EMULATORS) connectFirestoreEmulator(db, '127.0.0.1', 8080);
  return db;
}
