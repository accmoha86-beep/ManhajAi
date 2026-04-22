'use client';

import { useUIStore } from '@/store/ui-store';

export default function SiteLayoutClient({ children }: { children: React.ReactNode }) {
  const sidebarCollapsed = useUIStore((s: any) => s.sidebarCollapsed);
  const marginRight = sidebarCollapsed ? '3.75rem' : '15rem';

  return (
    <main
      className="flex-1 transition-all duration-300"
      style={{
        marginTop: '4rem',
        marginRight,
        minHeight: 'calc(100vh - 4rem)',
        background: 'var(--theme-page-bg)',
      }}
    >
      {children}
    </main>
  );
}
