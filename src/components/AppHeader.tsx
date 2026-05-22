'use client';

import Link from 'next/link';
import { Flame, Settings } from 'lucide-react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

export function AppHeader({ name, streak = 0 }: { name: string | null; streak?: number }) {
  const greeting = greetingFor();
  return (
    <header className="flex items-start justify-between mb-4">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-ink-500">{greeting}</p>
        <h1 className="font-serif text-3xl leading-none mt-1">
          {name ? (
            <>
              Hi, <em className="italic text-rose-500">{name}</em>
            </>
          ) : (
            'Welcome'
          )}
        </h1>
        {streak >= 1 && (
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3 py-1 text-xs font-medium text-rose-600">
            <Flame size={13} strokeWidth={2} />
            {streak}-day check-in streak
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <Link
          href="/settings"
          className="rounded-full h-10 w-10 grid place-items-center border border-cream-200 bg-cream-50/70 hover:bg-cream-100 text-ink-700"
          aria-label="Settings"
          title="Settings"
        >
          <Settings size={18} />
        </Link>
      </div>
    </header>
  );
}

function greetingFor() {
  const h = new Date().getHours();
  if (h < 5) return 'Late night';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}
