'use client';

import { useEffect } from 'react';
import { useUIStore } from '@/store/ui-store';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useUIStore((s: any) => s.theme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'default') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', theme);
    }
  }, [theme]);

  return <>{children}</>;
}
