'use client';

import AuthGate from '@/components/AuthGate';
import Shortcuts from '@/components/Shortcuts';
import { JournalProvider } from '@/contexts/JournalContext';

export default function MainLayout({ children }: LayoutProps<'/'>) {
  return (
    <AuthGate>
      <JournalProvider>
        <Shortcuts />
        {children}
      </JournalProvider>
    </AuthGate>
  );
}
