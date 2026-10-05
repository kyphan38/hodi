'use client';

import AuthGate from '@/components/AuthGate';
import { JournalProvider } from '@/contexts/JournalContext';

export default function MainLayout({ children }: LayoutProps<'/'>) {
  return (
    <AuthGate>
      <JournalProvider>{children}</JournalProvider>
    </AuthGate>
  );
}
