'use client';

import AuthGate from '@/components/AuthGate';

export default function MainLayout({ children }: LayoutProps<'/'>) {
  return <AuthGate>{children}</AuthGate>;
}
