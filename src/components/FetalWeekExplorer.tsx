'use client';

import { useState } from 'react';
import { Apple, Baby, ChevronLeft, ChevronRight, Ruler, Weight } from 'lucide-react';
import {
  fetalDataForWeek,
  MAX_FETAL_WEEK,
  MIN_FETAL_WEEK,
} from '@/lib/fetal-development';
import { FetalIllustration } from '@/components/FetalIllustration';

function formatLength(cm: number | null): string {
  if (cm == null) return '—';
  if (cm < 1) return `${(cm * 10).toFixed(0)} mm`;
  return `${cm.toFixed(1)} cm`;
}

function formatWeight(g: number | null): string {
  if (g == null) return '—';
  if (g < 1000) return `${Math.round(g)} g`;
  return `${(g / 1000).toFixed(2)} kg`;
}

export function FetalWeekExplorer({ currentWeek }: { currentWeek: number }) {
  const clampedStart = Math.min(MAX_FETAL_WEEK, Math.max(MIN_FETAL_WEEK, currentWeek));
  const [week, setWeek] = useState(clampedStart);
  const [view, setView] = useState<'size' | 'illustration'>('size');
  const data = fetalDataForWeek(week);
  const isCurrent = week === clampedStart;

  return (
    <section className="rounded-[1.75rem] border border-cream-200 bg-cream-50/70 p-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setWeek((w) => Math.max(MIN_FETAL_WEEK, w - 1))}
          disabled={week <= MIN_FETAL_WEEK}
          aria-label="Previous week"
          className="h-10 w-10 grid place-items-center rounded-full border border-cream-200 bg-cream-50 text-ink-700 hover:bg-cream-100 disabled:opacity-40"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <p className="text-[11px] uppercase tracking-[0.25em] text-mauve-500">
            {isCurrent ? 'This week' : 'Week'}
          </p>
          <p className="font-serif text-3xl leading-none text-ink-900">Week {week}</p>
        </div>
        <button
          onClick={() => setWeek((w) => Math.min(MAX_FETAL_WEEK, w + 1))}
          disabled={week >= MAX_FETAL_WEEK}
          aria-label="Next week"
          className="h-10 w-10 grid place-items-center rounded-full border border-cream-200 bg-cream-50 text-ink-700 hover:bg-cream-100 disabled:opacity-40"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* View toggle: fruit size vs illustration */}
      <div className="mt-5 flex rounded-full border border-cream-200 bg-cream-50 p-1">
        <button
          onClick={() => setView('size')}
          className={[
            'flex-1 flex items-center justify-center gap-1.5 rounded-full py-2 text-sm transition',
            view === 'size' ? 'bg-mauve-500 text-cream-50' : 'text-ink-600',
          ].join(' ')}
        >
          <Apple size={15} /> Fruit size
        </button>
        <button
          onClick={() => setView('illustration')}
          className={[
            'flex-1 flex items-center justify-center gap-1.5 rounded-full py-2 text-sm transition',
            view === 'illustration' ? 'bg-mauve-500 text-cream-50' : 'text-ink-600',
          ].join(' ')}
        >
          <Baby size={15} /> Baby
        </button>
      </div>

      <div className="mt-5 flex flex-col items-center text-center min-h-[180px] justify-center">
        {view === 'size' ? (
          <>
            <span className="text-6xl" aria-hidden>
              {data.emoji}
            </span>
            <p className="mt-2 font-serif text-2xl text-ink-900">size of {data.fruit}</p>
          </>
        ) : (
          <FetalIllustration week={week} />
        )}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-cream-200 bg-cream-50 p-3 flex items-center gap-2">
          <Ruler size={16} className="text-mauve-500 shrink-0" />
          <div>
            <p className="text-[10px] uppercase tracking-widest text-ink-500">Length</p>
            <p className="text-sm font-medium text-ink-900">{formatLength(data.lengthCm)}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-cream-200 bg-cream-50 p-3 flex items-center gap-2">
          <Weight size={16} className="text-mauve-500 shrink-0" />
          <div>
            <p className="text-[10px] uppercase tracking-widest text-ink-500">Weight</p>
            <p className="text-sm font-medium text-ink-900">{formatWeight(data.weightG)}</p>
          </div>
        </div>
      </div>

      <p className="mt-5 text-sm text-ink-700 leading-relaxed">{data.milestone}</p>

      {!isCurrent && (
        <button
          onClick={() => setWeek(clampedStart)}
          className="mt-4 w-full rounded-2xl border border-cream-200 bg-cream-50 py-2.5 text-sm text-ink-600 hover:bg-cream-100"
        >
          Back to this week
        </button>
      )}
    </section>
  );
}
