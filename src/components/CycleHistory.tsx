'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { CalendarRange } from 'lucide-react';
import type { PeriodLog } from '@/lib/cycle';
import { buildCycleHistory, regularityBlurb, type CycleRecord } from '@/lib/cycle-history';

const REG_COLOR: Record<string, string> = {
  regular: 'text-sage-500',
  'mostly regular': 'text-sage-500',
  irregular: 'text-rose-500',
  unknown: 'text-ink-500',
};

export function CycleHistory({ periods }: { periods: PeriodLog[] }) {
  const { records, stats } = useMemo(() => buildCycleHistory(periods), [periods]);
  const [showAll, setShowAll] = useState(false);

  if (stats.totalStarts === 0) {
    return (
      <div className="rounded-3xl border border-cream-200 bg-cream-50/70 p-6 text-center">
        <p className="font-serif text-2xl">No cycle history yet</p>
        <p className="text-ink-600 text-sm mt-2">Log or import a couple of periods to see your trends.</p>
      </div>
    );
  }

  // Newest first for the list; last 12 completed for the chart (chronological).
  const newestFirst = [...records].reverse();
  const chartCycles = records.filter((r) => r.cycleLength != null).slice(-12);
  const chartMax = chartCycles.length ? Math.max(...chartCycles.map((c) => c.cycleLength!)) : 1;
  const chartMin = chartCycles.length ? Math.min(...chartCycles.map((c) => c.cycleLength!)) : 1;
  const range = Math.max(chartMax - chartMin, 1);

  const visible = showAll ? newestFirst : newestFirst.slice(0, 8);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Avg cycle" value={stats.avgCycle ? `${stats.avgCycle}` : '—'} unit="days" />
        <Stat label="Avg period" value={stats.avgPeriod ? `${stats.avgPeriod}` : '—'} unit="days" />
        <Stat label="Tracked" value={`${stats.totalStarts}`} unit="cycles" />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Shortest" value={stats.minCycle ? `${stats.minCycle}` : '—'} unit="days" />
        <Stat label="Longest" value={stats.maxCycle ? `${stats.maxCycle}` : '—'} unit="days" />
        <Stat label="Variation" value={stats.variation != null ? `${stats.variation}` : '—'} unit="days" />
      </div>

      {/* Regularity */}
      <section className="rounded-[1.5rem] border border-cream-200 bg-cream-50/70 p-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-sage-100 grid place-items-center text-sage-500">
            <CalendarRange size={18} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-ink-500">Regularity</p>
            <p className={`font-serif text-xl capitalize ${REG_COLOR[stats.regularity]}`}>
              {stats.regularity === 'unknown' ? 'Building a picture' : stats.regularity}
            </p>
          </div>
        </div>
        <p className="text-sm text-ink-600 mt-3 leading-relaxed">{regularityBlurb(stats)}</p>
        {stats.firstStart && stats.lastStart && (
          <p className="text-xs text-ink-500 mt-2">
            History spans {format(stats.firstStart, 'MMM yyyy')} → {format(stats.lastStart, 'MMM yyyy')}.
          </p>
        )}
      </section>

      {/* Trend chart */}
      {chartCycles.length >= 2 && (
        <section className="rounded-[1.5rem] border border-cream-200 bg-cream-50/70 p-5">
          <h2 className="font-serif text-xl">Recent cycle lengths</h2>
          <div className="mt-4 flex items-end gap-1.5 h-32">
            {chartCycles.map((c, i) => {
              const h = 30 + ((c.cycleLength! - chartMin) / range) * 80;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[9px] text-ink-500">{c.cycleLength}</span>
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-rose-400 to-rose-300"
                    style={{ height: `${h}%` }}
                    title={`${c.cycleLength} days from ${format(c.start, 'MMM d, yyyy')}`}
                  />
                  <span className="text-[9px] text-ink-500">{format(c.start, 'MMM')}</span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-ink-500 mt-2">
            Last {chartCycles.length} cycles. Cycles consistently outside 21–35 days are worth raising
            with a clinician.
          </p>
        </section>
      )}

      {/* Full list */}
      <section className="rounded-[1.5rem] border border-cream-200 bg-cream-50/70 p-5">
        <h2 className="font-serif text-xl mb-3">Every cycle</h2>
        <div className="space-y-1.5">
          {visible.map((c, i) => (
            <CycleRow key={i} record={c} isCurrent={i === 0} />
          ))}
        </div>
        {newestFirst.length > 8 && (
          <button
            onClick={() => setShowAll((s) => !s)}
            className="mt-4 w-full rounded-2xl border border-cream-200 bg-cream-50 py-2.5 text-sm text-ink-600 hover:bg-cream-100"
          >
            {showAll ? 'Show less' : `Show all ${newestFirst.length} cycles`}
          </button>
        )}
      </section>
    </div>
  );
}

function CycleRow({ record, isCurrent }: { record: CycleRecord; isCurrent: boolean }) {
  const dev = record.deviation;
  return (
    <div className="flex items-center justify-between rounded-2xl bg-cream-50 border border-cream-200 px-4 py-2.5">
      <div>
        <p className="text-sm font-medium text-ink-900">
          {format(record.start, 'MMM d, yyyy')}
          {isCurrent && <span className="ml-2 text-[10px] text-rose-500 uppercase tracking-wide">current</span>}
        </p>
        <p className="text-xs text-ink-500">{record.periodLength}-day period</p>
      </div>
      <div className="text-right">
        {record.cycleLength != null ? (
          <>
            <p className="text-sm font-medium text-ink-900">{record.cycleLength} days</p>
            {dev != null && dev !== 0 && (
              <p className={`text-xs ${dev > 0 ? 'text-mauve-500' : 'text-sage-500'}`}>
                {dev > 0 ? '+' : ''}
                {dev} vs avg
              </p>
            )}
          </>
        ) : (
          <p className="text-xs text-ink-500">in progress</p>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-2xl border border-cream-200 bg-cream-50/70 p-3 text-center">
      <p className="text-[10px] uppercase tracking-widest text-ink-500">{label}</p>
      <p className="font-serif text-3xl text-ink-900 leading-none mt-1">{value}</p>
      <p className="text-[10px] text-ink-500 mt-1">{unit}</p>
    </div>
  );
}
