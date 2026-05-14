import Link from 'next/link';
import { ArrowRight, Droplet } from 'lucide-react';

export function QuickLog() {
  return (
    <Link
      href="/log"
      className="block rounded-3xl bg-ink-900 text-cream-50 p-5 group hover:bg-ink-800 transition-colors"
    >
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-2xl bg-rose-500/90 grid place-items-center">
          <Droplet size={22} strokeWidth={1.75} />
        </div>
        <div className="flex-1">
          <p className="text-xs uppercase tracking-widest text-cream-200/70">Today</p>
          <p className="font-serif text-2xl leading-tight">Log how you feel</p>
        </div>
        <ArrowRight
          size={20}
          className="text-cream-200 group-hover:translate-x-0.5 transition-transform"
        />
      </div>
    </Link>
  );
}
