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
      <body className="font-cairo antialiased">
        {children}
      </body>
    </html>
  );
}
