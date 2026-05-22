import { Sparkles, TrendingUp, Heart, AlertCircle } from 'lucide-react';
import type { Insight } from '@/lib/patterns';

const TONE = {
  neutral: { icon: Sparkles, color: 'text-mauve-500', bg: 'bg-mauve-100' },
  positive: { icon: Heart, color: 'text-sage-500', bg: 'bg-sage-100' },
  watch: { icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-100' },
} as const;

export function AIInsights({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) {
    return (
      <section className="rounded-[1.75rem] border border-mauve-200 bg-gradient-to-br from-mauve-50 via-rose-50 to-cream-50 p-6">
        <div className="flex items-center gap-2 text-mauve-500">
          <Sparkles size={18} />
          <p className="text-[11px] uppercase tracking-[0.25em]">Insights for you</p>
        </div>
        <p className="mt-3 font-serif text-2xl text-ink-900 leading-snug">
          Keep logging and patterns will appear here.
        </p>
        <p className="text-sm text-ink-600 mt-2">
          Once you&apos;ve tracked symptoms, sleep, and energy across a few cycles, Luna spots
          connections — like which phase your symptoms cluster in, or what short sleep does to you.
        </p>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-[1.75rem] border border-mauve-200 bg-gradient-to-br from-mauve-50 via-rose-50 to-cream-50 p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-mauve-200/40 blur-3xl animate-float-slow"
      />
      <div className="relative">
        <div className="flex items-center gap-2 text-mauve-500">
          <Sparkles size={18} />
          <p className="text-[11px] uppercase tracking-[0.25em]">Insights for you</p>
        </div>
        <div className="mt-4 space-y-3">
          {insights.map((ins) => {
            const t = TONE[ins.tone];
            const Icon = t.icon;
            return (
              <div key={ins.id} className="flex items-start gap-3">
                <div className={`mt-0.5 h-8 w-8 shrink-0 rounded-xl ${t.bg} grid place-items-center ${t.color}`}>
                  <Icon size={15} />
                </div>
                <p className="text-[15px] text-ink-800 leading-relaxed">{ins.text}</p>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-[11px] text-ink-500 leading-relaxed">
          Observations from your own logs — patterns, not diagnoses. Always trust your body and a
          clinician over an app.
        </p>
      </div>
    </section>
  );
}
