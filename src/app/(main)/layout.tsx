'use client';

import AppLock from '@/components/AppLock';
import AuthGate from '@/components/AuthGate';
import Shortcuts from '@/components/Shortcuts';
import { JournalProvider } from '@/contexts/JournalContext';

export default function MainLayout({ children }: LayoutProps<'/'>) {
  return (
    <AuthGate>
      <AppLock>
        <JournalProvider>
          <Shortcuts />
          {children}
        </JournalProvider>
      </AppLock>
    </AuthGate>
  );
}
