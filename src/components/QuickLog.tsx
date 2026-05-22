import Link from 'next/link';
import { ArrowRight, Droplet } from 'lucide-react';

export function QuickLog() {
  return (
    <Link
      href="/log"
      className="group block overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-rose-500 via-rose-600 to-mauve-500 p-[1px] shadow-[0_18px_40px_-20px_rgb(var(--rose-500)/0.6)] transition-transform hover:-translate-y-0.5"
    >
      <div className="relative rounded-[1.7rem] bg-gradient-to-br from-rose-500 via-rose-600 to-mauve-500 p-5">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-6 -bottom-8 h-28 w-28 rounded-full bg-white/15 blur-2xl"
        />
        <div className="relative flex items-center gap-4 text-white">
          <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur grid place-items-center">
            <Droplet size={22} strokeWidth={1.75} />
          </div>
          <div className="flex-1">
            <p className="text-xs uppercase tracking-widest text-white/70">Today</p>
            <p className="font-serif text-2xl leading-tight">Log how you feel</p>
          </div>
          <ArrowRight size={20} className="text-white/90 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </Link>
  );
}
