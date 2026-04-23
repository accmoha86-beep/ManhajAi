'use client';

import { useUIStore } from '@/store/ui-store';
import { useAuthStore } from '@/store/auth-store';
import { useState, useEffect } from 'react';

export default function SiteLayoutClient({ children }: { children: React.ReactNode }) {
  const sidebarCollapsed = useUIStore((s: any) => s.sidebarCollapsed);
  const { user } = useAuthStore();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // On mobile: no sidebar margin (sidebar is overlay)
  // On desktop: respect sidebar width
  const marginRight = isMobile ? '0' : (user ? (sidebarCollapsed ? '3.75rem' : '15rem') : '0');

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
