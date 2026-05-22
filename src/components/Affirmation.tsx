import { Sparkle } from 'lucide-react';
import type { CycleInfo } from '@/lib/cycle';
import { affirmationFor, selfCareFor } from '@/lib/affirmations';

export function Affirmation({ info }: { info: CycleInfo }) {
  const message = affirmationFor(info.phase);
  const care = selfCareFor(info.phase);

  return (
    <section className="relative overflow-hidden rounded-[1.75rem] border border-mauve-200 bg-gradient-to-br from-mauve-50 via-rose-50 to-cream-50 p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-mauve-200/40 blur-2xl animate-float-slow"
      />
      <div className="relative flex items-start gap-3">
        <div className="mt-0.5 h-9 w-9 shrink-0 rounded-2xl bg-mauve-100 grid place-items-center text-mauve-500">
          <Sparkle size={18} strokeWidth={1.75} />
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-mauve-500">A note to self</p>
          <p className="font-serif text-2xl leading-snug mt-1 text-ink-900">{message}</p>
          <p className="text-sm text-ink-600 mt-3">
            Today, treat yourself to <span className="text-ink-800 font-medium">{care}</span>.
          </p>
        </div>
      </div>
    </section>
  );
}
