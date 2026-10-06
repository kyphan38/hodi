import type { Metadata, Viewport } from 'next';

import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import PrivacyVeil from '@/components/PrivacyVeil';
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar';
import { BG_DARK, BG_LIGHT, THEME_SCRIPT } from '@/lib/prefs';

// The tab title is always "hodi" - never a date or content (private when
// sharing a screen). No page sets its own title.
export const metadata: Metadata = {
  title: 'hodi',
  description: 'A quiet daily journal',
  icons: {
    icon: '/favicon.svg',
    apple: '/icons/apple-touch-icon.png',
  },
  appleWebApp: { capable: true, title: 'hodi', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  // No zoom lock like fina: this is a reading/writing app, zoom belongs to the eyes.
  // Inputs are >= 16px, so iOS does not zoom on focus.
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: BG_LIGHT },
    { media: '(prefers-color-scheme: dark)', color: BG_DARK },
  ],
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    // data-theme/data-size are set by THEME_SCRIPT before React hydrates.
    <html lang="en" data-size="m" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
        <PrivacyVeil />
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
