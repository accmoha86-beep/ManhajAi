'use client';

import { useUIStore } from '@/store/ui-store';
import { useAuthStore } from '@/store/auth-store';

export default function SiteLayoutClient({ children }: { children: React.ReactNode }) {
  const sidebarCollapsed = useUIStore((s: any) => s.sidebarCollapsed);
  const { user } = useAuthStore();
  const marginRight = user ? (sidebarCollapsed ? '3.75rem' : '15rem') : '0';

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
