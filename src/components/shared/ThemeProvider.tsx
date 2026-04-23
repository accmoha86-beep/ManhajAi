'use client';

import { useEffect } from 'react';
import { useUIStore } from '@/store/ui-store';
import type { ThemeSlug } from '@/store/ui-store';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useUIStore((s: { theme: ThemeSlug }) => s.theme);
  const setTheme = useUIStore((s: { setTheme: (t: ThemeSlug) => void }) => s.setTheme);

  // On mount, fetch the active theme from DB and apply it
  useEffect(() => {
    async function fetchActiveTheme() {
      try {
        const res = await fetch('/api/public/active-theme');
        if (!res.ok) return;
        const data = await res.json();
        if (data.slug && data.slug !== theme) {
          setTheme(data.slug as ThemeSlug);
        }
      } catch {
        // Silently fail — use stored/default theme
      }
    }
    fetchActiveTheme();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply theme attribute whenever it changes
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
