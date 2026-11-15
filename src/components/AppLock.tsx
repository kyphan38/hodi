'use client';

import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { hiddenAtStore, lockCredStore, shouldLock, unlock } from '@/lib/lock';

/**
 * Covers the journal with a lock screen when the app comes back after
 * LOCK_AFTER_MS away and a passkey is set up (Settings, Face ID lock).
 * The children are not rendered while locked, so nothing shows behind it.
 */
export default function AppLock({ children }: { children: ReactNode }) {
  const { signOut } = useAuth();
  const credId = useSyncExternalStore(lockCredStore.subscribe, lockCredStore.get, lockCredStore.getServer);
  // Decided on mount from the last time the app was hidden (covers a cold start too).
  const [locked, setLocked] = useState(() =>
    typeof window === 'undefined' ? false : shouldLock(lockCredStore.get(), hiddenAtStore.get(), Date.now()),
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const away = () => hiddenAtStore.set(String(Date.now()));
    const back = () => {
      if (shouldLock(lockCredStore.get(), hiddenAtStore.get(), Date.now())) setLocked(true);
    };
    const onVisibility = () => (document.visibilityState === 'hidden' ? away() : back());
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', away);
    window.addEventListener('pageshow', back);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', away);
      window.removeEventListener('pageshow', back);
    };
  }, []);

  if (!locked || !credId) return <>{children}</>;

  const tryUnlock = async () => {
    setBusy(true);
    const ok = await unlock(credId);
    setBusy(false);
    if (ok) {
      hiddenAtStore.set('');
      setLocked(false);
    }
  };

  return (
    <main className="paper flex min-h-dvh flex-col items-center justify-center gap-8 text-[15px]">
      <button type="button" disabled={busy} onClick={() => void tryUnlock()} className="text-ink disabled:opacity-40">
        unlock
      </button>
      <button type="button" onClick={signOut} className="text-faint hover:text-muted">
        sign out
      </button>
    </main>
  );
}
