'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, Home, NotebookPen, Sparkles, UsersRound } from 'lucide-react';

const tabs = [
  { href: '/dashboard', label: 'Today', icon: Home },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/log', label: 'Log', icon: NotebookPen, accent: true },
  { href: '/insights', label: 'Insights', icon: Sparkles },
  { href: '/partner', label: 'Partner', icon: UsersRound },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 safe-bottom">
      <div className="mx-auto max-w-md px-4 pb-2">
        <div className="glass rounded-3xl border border-cream-200 shadow-[0_10px_40px_-12px_rgba(58,29,17,0.15)] grid grid-cols-5">
          {tabs.map(({ href, label, icon: Icon, accent }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center justify-center py-3 gap-1 group"
              >
                <span
                  className={[
                    'flex items-center justify-center rounded-2xl transition-all',
                    accent
                      ? 'h-11 w-11 -mt-6 bg-rose-500 text-cream-50 shadow-lg shadow-rose-500/30 group-active:scale-95'
                      : 'h-8 w-8',
                    active && !accent ? 'text-rose-600' : 'text-ink-600',
                  ].join(' ')}
                >
                  <Icon size={accent ? 22 : 20} strokeWidth={1.75} />
                </span>
                <span
                  className={[
                    'text-[10px] tracking-wide',
                    active ? 'text-ink-900 font-medium' : 'text-ink-500',
                  ].join(' ')}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
