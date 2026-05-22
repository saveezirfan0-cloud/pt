'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

type ThemeContextValue = {
  theme: Theme;
  resolved: 'light' | 'dark';
  setTheme: (t: Theme) => void;
  toggle: () => void;
};

const STORAGE_KEY = 'luna-theme';
const ThemeContext = createContext<ThemeContextValue | null>(null);

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function apply(theme: Theme): 'light' | 'dark' {
  const resolved = theme === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : theme;
  const root = document.documentElement;
  root.classList.toggle('dark', resolved === 'dark');
  return resolved;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolved, setResolved] = useState<'light' | 'dark'>('light');

  // Initialise from storage on mount.
  useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? 'system';
    setThemeState(stored);
    setResolved(apply(stored));
  }, []);

  // Keep in sync with OS changes while on "system".
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setResolved(apply('system'));
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem(STORAGE_KEY, t);
    setResolved(apply(t));
    // hint native form controls / browser UI
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      const dark = (t === 'system' ? systemPrefersDark() : t === 'dark');
      meta.setAttribute('content', dark ? '#161110' : '#FDF8F4');
    }
  }, []);

  const toggle = useCallback(() => {
    setTheme(resolved === 'dark' ? 'light' : 'dark');
  }, [resolved, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

/** Inline script string that sets the theme class before first paint (no FOUC). */
export const themeInitScript = `
(function(){try{
  var t = localStorage.getItem('${STORAGE_KEY}') || 'system';
  var d = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  if (d) document.documentElement.classList.add('dark');
  var m = document.querySelector('meta[name="theme-color"]');
  if (m) m.setAttribute('content', d ? '#161110' : '#FDF8F4');
}catch(e){}})();
`;
