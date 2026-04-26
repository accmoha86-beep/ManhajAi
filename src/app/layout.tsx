import type { Metadata, Viewport } from 'next';
import '@/styles/globals.css';
import { ToastContainer } from '@/components/shared/Toast';
import { ConfirmDialogContainer } from '@/components/shared/ConfirmDialog';

export const metadata: Metadata = {
  title: 'منهج AI — منصة تعليمية ذكية',
  description: 'منصة تعليمية مدعومة بالذكاء الاصطناعي لطلاب الثانوية العامة في مصر',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'منهج AI',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#3B82F6',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        {/* Google Fonts — Cairo (Arabic) — all weights */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@200;300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        {/* Favicon */}
        <link rel="icon" href="/logo-icon.png" type="image/png" />
      </head>
      <body className="font-cairo antialiased">
        {children}
        <ToastContainer />
        <ConfirmDialogContainer />
      </body>
    </html>
  );
}
