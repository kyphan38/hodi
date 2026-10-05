import type { Metadata, Viewport } from 'next';

import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import PrivacyVeil from '@/components/PrivacyVeil';
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar';
import { BG_DARK, BG_LIGHT, THEME_SCRIPT } from '@/lib/prefs';

// Tiêu đề tab luôn là "hodi" - không bao giờ lộ ngày hay nội dung (riêng tư
// khi chia sẻ màn hình). Không trang nào đặt title riêng.
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
  // Không khoá zoom như fina: đây là app đọc/viết, phóng to là quyền của mắt.
  // Chữ nhập >= 16px nên iOS không tự zoom khi focus.
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
    // data-theme/data-size do THEME_SCRIPT đặt trước khi React hydrate.
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
