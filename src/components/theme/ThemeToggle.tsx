'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/theme/ThemeProvider';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { resolved, toggle } = useTheme();
  const isDark = resolved === 'dark';
  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      className={[
        'relative rounded-full h-10 w-10 grid place-items-center overflow-hidden',
        'border border-cream-200 bg-cream-50/70 hover:bg-cream-100 text-ink-700 transition-colors',
        className,
      ].join(' ')}
    >
      <Sun
        size={18}
        className={[
          'absolute transition-all duration-300',
          isDark ? 'opacity-0 -rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100',
        ].join(' ')}
      />
      <Moon
        size={18}
        className={[
          'absolute transition-all duration-300',
          isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-90 scale-50',
        ].join(' ')}
      />
    </button>
  );
}
