'use client';

import { useEffect } from 'react';
import { useUIStore } from '@/store/ui-store';
import type { ThemeSlug } from '@/store/ui-store';

const VALID_THEMES: ThemeSlug[] = ['default', 'golden', 'exams', 'graduation', 'dark'];

function applyTheme(theme: ThemeSlug) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'default') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', theme);
  }
}

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
        if (data.slug && VALID_THEMES.includes(data.slug as ThemeSlug)) {
          setTheme(data.slug as ThemeSlug);
          applyTheme(data.slug as ThemeSlug);
        }
      } catch {
        // Silently fail — use stored/default theme
      }
    }
    // Apply stored theme immediately (before API call)
    applyTheme(theme);
    fetchActiveTheme();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply theme attribute whenever it changes
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return <>{children}</>;
}
