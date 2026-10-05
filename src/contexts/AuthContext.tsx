'use client';

// ============================================================
// hodi - Đăng nhập (chỉ phía client)
//
// Dựa trên fina/src/contexts/AuthContext.tsx nhưng KHÔNG có session cookie hay
// /api/auth/session: hodi không có server. Firebase Auth tự giữ phiên trong
// IndexedDB, mở app offline vẫn biết ai đang đăng nhập.
//
// uidHintStore nhớ uid lần trước để trang viết hiện ra NGAY khi mở app,
// không chờ Firebase Auth đọc xong IndexedDB (không spinner trước khi viết).
// ============================================================

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithCredential,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { clearIndexedDbPersistence, terminate } from 'firebase/firestore';

import { allowedEmail, isAllowedUser } from '@/lib/auth/allowed-user';
import { USE_EMULATORS, getAuthClient, getDb, missingConfig } from '@/lib/firebase-client';
import { clearHodiStorage, stringStore } from '@/lib/store';

const NOT_AUTHORIZED = 'This account is not allowed here.';
const UNAUTHORIZED_DOMAIN =
  'This domain is not allowed to sign in. Add it in Firebase Console → Authentication → Settings → Authorized domains.';
const GENERIC = 'Sign-in failed. Please try again.';

/** uid của lần đăng nhập trước, '' nếu chưa có. */
export const uidHintStore = stringStore<string>('hodi.uid', '', (raw) => raw);

type AuthState = {
  user: User | null;
  /** true khi chưa biết đã đăng nhập hay chưa. */
  loading: boolean;
  signingIn: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

function newProvider() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return provider;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = missingConfig().length === 0;
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(configured);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!configured) return;
    const auth = getAuthClient();

    // Kết quả của signInWithRedirect (đường lui khi popup bị chặn trên iOS).
    getRedirectResult(auth).catch((err) => {
      // onAuthStateChanged vẫn chạy; lỗi ở đây không chặn app.
      console.warn('[auth] redirect result failed', err);
    });

    return onAuthStateChanged(auth, async (next) => {
      if (next && !isAllowedUser(next)) {
        setError(NOT_AUTHORIZED);
        uidHintStore.set('');
        setUser(null);
        setLoading(false);
        await firebaseSignOut(auth);
        return;
      }
      uidHintStore.set(next?.uid ?? '');
      setUser(next);
      setLoading(false);
    });
  }, [configured]);

  const signIn = useCallback(async () => {
    setError(null);
    setSigningIn(true);
    try {
      // Emulator: đăng nhập thẳng bằng Google credential giả (emulator chấp
      // nhận token JSON không ký). Popup/redirect cần iframe khác origin mà
      // trình duyệt test thường chặn.
      if (USE_EMULATORS) {
        const token = JSON.stringify({ sub: 'dev-hodi', email: allowedEmail, email_verified: true });
        await signInWithCredential(getAuthClient(), GoogleAuthProvider.credential(token));
        return;
      }
      await signInWithPopup(getAuthClient(), newProvider());
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        // Người dùng tự đóng - im lặng.
      } else if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
        try {
          await signInWithRedirect(getAuthClient(), newProvider());
          return; // trang sẽ điều hướng đi
        } catch {
          setError(GENERIC);
        }
      } else if (code === 'auth/unauthorized-domain') {
        setError(UNAUTHORIZED_DOMAIN);
      } else if (code === 'auth/network-request-failed') {
        setError('No network connection. Check your connection and try again.');
      } else {
        setError(GENERIC);
      }
    } finally {
      setSigningIn(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await firebaseSignOut(getAuthClient());
    } finally {
      // Riêng tư: xoá luôn nháp và cache Firestore trên máy này.
      clearHodiStorage();
      try {
        const db = getDb();
        await terminate(db);
        await clearIndexedDbPersistence(db);
      } catch {
        // Tab khác còn mở thì không xoá được cache - vẫn đăng xuất bình thường.
      }
      window.location.replace('/login/');
    }
  }, []);

  const value = useMemo<AuthState>(
    () => ({ user, loading, signingIn, error, signIn, signOut }),
    [user, loading, signingIn, error, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>.');
  return ctx;
}
