import type { Metadata } from 'next';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'منهج AI — منصة تعليمية ذكية',
  description: 'منصة تعليمية مدعومة بالذكاء الاصطناعي لطلاب الثانوية العامة في مصر',
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
      </body>
    </html>
  );
}
