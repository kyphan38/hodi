'use client';

import { createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

import { uidHintStore, useAuth } from '@/contexts/AuthContext';

const UidContext = createContext<string | null>(null);

/** uid của người đang viết. Chỉ dùng bên trong <AuthGate>. */
export function useUid(): string {
  const uid = useContext(UidContext);
  if (!uid) throw new Error('useUid must be used inside <AuthGate>.');
  return uid;
}

/**
 * Cổng đăng nhập cho mọi trang trong (main).
 *
 * Có uid của lần trước (uidHintStore) thì hiện trang ngay, không chờ Firebase
 * Auth. Nếu hoá ra đã đăng xuất thì mới chuyển sang /login. Không bao giờ có
 * spinner: trong lúc chờ chỉ là trang giấy trống.
 */
export default function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const hint = useSyncExternalStore(uidHintStore.subscribe, uidHintStore.get, uidHintStore.getServer);

  const uid = user?.uid ?? (loading && hint ? hint : null);

  useEffect(() => {
    if (!loading && !user) router.replace('/login/');
  }, [loading, user, router]);

  if (!uid) return <div className="min-h-dvh" />;
  return <UidContext.Provider value={uid}>{children}</UidContext.Provider>;
}
