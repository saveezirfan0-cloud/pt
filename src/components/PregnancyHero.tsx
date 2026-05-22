import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { countdownText, type PregnancyInfo } from '@/lib/pregnancy';
import { fetalDataForWeek } from '@/lib/fetal-development';

export function PregnancyHero({
  info,
  babyName,
  href = '/pregnancy',
  compact = false,
}: {
  info: PregnancyInfo;
  babyName?: string | null;
  href?: string;
  compact?: boolean;
}) {
  const fetal = fetalDataForWeek(info.week);
  const pct = Math.round(info.progress * 100);

  const card = (
    <div className="relative overflow-hidden grain rounded-[2rem] border border-mauve-200 bg-gradient-to-br from-mauve-50 via-rose-50 to-cream-50 p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-mauve-200/40 blur-3xl animate-float-slow"
      />
      <div className="relative">
        <div className="flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-[0.3em] text-mauve-500">
            Trimester {info.trimester}
          </p>
          {compact && <ArrowRight size={18} className="text-mauve-400" />}
        </div>

        <div className="mt-2 flex items-end gap-4">
          <div>
            <p className="font-serif text-6xl leading-none text-ink-900">{info.week}</p>
            <p className="text-sm text-ink-600 mt-1">
              weeks{info.dayOfWeek ? ` + ${info.dayOfWeek}d` : ''}
            </p>
          </div>
          <div className="flex-1 text-right">
            <p className="text-5xl leading-none" aria-hidden>
              {fetal.emoji}
            </p>
            <p className="text-sm text-ink-700 mt-1">size of {fetal.fruit}</p>
          </div>
        </div>

        {/* progress bar */}
        <div className="mt-5">
          <div className="h-2.5 w-full rounded-full bg-cream-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-mauve-400 to-rose-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-ink-600">
            <span>{countdownText(info)}</span>
            <span>{pct}%</span>
          </div>
        </div>

        {!compact && (
          <p className="mt-5 text-sm text-ink-700 leading-relaxed">{fetal.milestone}</p>
        )}
      </div>
    </div>
  );

  return href ? (
    <Link href={href} className="block transition-transform hover:-translate-y-0.5">
      {card}
    </Link>
  ) : (
    card
  );
}
