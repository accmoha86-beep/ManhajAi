import TopBar from '@/components/shared/TopBar';
import Sidebar from '@/components/shared/Sidebar';
import ThemeProvider from '@/components/shared/ThemeProvider';
import SiteLayoutClient from '@/components/shared/SiteLayoutClient';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <div dir="rtl" className="min-h-screen flex flex-col font-cairo">
        <TopBar />
        <Sidebar />
        <SiteLayoutClient>{children}</SiteLayoutClient>
      </div>
    </ThemeProvider>
  );
}
