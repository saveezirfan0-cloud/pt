'use client';

import { useMemo, useState } from 'react';
import {
  addDays,
  addMonths,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  isWithinInterval,
  setMonth,
  setYear,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  FLOW_COLORS,
  computeCycleInfo,
  type CycleInfo,
  type DailyLog,
  type PeriodLog,
} from '@/lib/cycle';

export function PeriodCalendar({
  periods,
  dailies,
  info,
}: {
  periods: PeriodLog[];
  dailies: DailyLog[];
  info: CycleInfo;
}) {
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState<Date | null>(new Date());
  const [picking, setPicking] = useState(false);

  const periodMap = useMemo(() => {
    const m = new Map<string, PeriodLog>();
    for (const p of periods) m.set(p.date, p);
    return m;
  }, [periods]);

  const dailyMap = useMemo(() => {
    const m = new Map<string, DailyLog>();
    for (const d of dailies) m.set(d.date, d);
    return m;
  }, [dailies]);

  const days = useMemo(() => buildMonthGrid(cursor), [cursor]);

  // Build predicted-period intervals for the visible range (3 cycles ahead).
  const predicted: { start: Date; end: Date }[] = [];
  if (info.nextPeriodStart) {
    let start = info.nextPeriodStart;
    for (let i = 0; i < 3; i++) {
      const end = addDays(start, info.periodLength - 1);
      predicted.push({ start, end });
      start = addDays(start, info.cycleLength);
    }
  }

  const fertile = info.fertileWindowStart && info.fertileWindowEnd
    ? { start: info.fertileWindowStart, end: info.fertileWindowEnd }
    : null;

  const selKey = selected ? format(selected, 'yyyy-MM-dd') : null;
  const selPeriod = selKey ? periodMap.get(selKey) : null;
  const selDaily = selKey ? dailyMap.get(selKey) : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCursor(subMonths(cursor, 1))}
          className="h-9 w-9 rounded-full border border-cream-200 grid place-items-center text-ink-700 hover:bg-cream-100"
          aria-label="Previous month"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          onClick={() => setPicking((p) => !p)}
          className="font-serif text-2xl hover:text-rose-600 transition-colors"
          aria-label="Jump to month or year"
        >
          {format(cursor, 'MMMM yyyy')}
        </button>
        <button
          onClick={() => setCursor(addMonths(cursor, 1))}
          className="h-9 w-9 rounded-full border border-cream-200 grid place-items-center text-ink-700 hover:bg-cream-100"
          aria-label="Next month"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {picking && (
        <div className="rounded-3xl border border-cream-200 bg-cream-50/80 p-4 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setCursor(setYear(cursor, cursor.getFullYear() - 1))}
              className="h-8 w-8 rounded-full border border-cream-200 grid place-items-center text-ink-700 hover:bg-cream-100"
              aria-label="Previous year"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="font-serif text-xl">{cursor.getFullYear()}</span>
            <button
              onClick={() => setCursor(setYear(cursor, cursor.getFullYear() + 1))}
              className="h-8 w-8 rounded-full border border-cream-200 grid place-items-center text-ink-700 hover:bg-cream-100"
              aria-label="Next year"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {Array.from({ length: 12 }).map((_, m) => {
              const isCur = cursor.getMonth() === m;
              return (
                <button
                  key={m}
                  onClick={() => {
                    setCursor(setMonth(cursor, m));
                    setPicking(false);
                  }}
                  className={[
                    'rounded-xl py-2 text-sm transition',
                    isCur ? 'bg-rose-500 text-cream-50' : 'bg-cream-50 text-ink-700 hover:bg-cream-100 border border-cream-200',
                  ].join(' ')}
                >
                  {format(setMonth(cursor, m), 'MMM')}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => {
              const now = new Date();
              setCursor(now);
              setSelected(now);
              setPicking(false);
            }}
            className="mt-3 w-full rounded-xl border border-cream-200 bg-cream-50 py-2 text-sm text-ink-600 hover:bg-cream-100"
          >
            Jump to today
          </button>
        </div>
      )}

      <div className="grid grid-cols-7 gap-1 text-[10px] uppercase tracking-widest text-ink-500 text-center">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d) => {
          const key = format(d, 'yyyy-MM-dd');
          const period = periodMap.get(key);
          const daily = dailyMap.get(key);
          const inMonth = isSameMonth(d, cursor);
          const isToday = isSameDay(d, new Date());
          const isSelected = selected && isSameDay(d, selected);
          const isPredicted = predicted.some((r) =>
            isWithinInterval(d, { start: r.start, end: r.end })
          );
          const isFertile = fertile && isWithinInterval(d, fertile);

          let bg = 'transparent';
          let ring = '';
          let textColor = inMonth ? 'text-ink-900' : 'text-ink-400';
          if (period) {
            bg = FLOW_COLORS[period.flow];
            textColor = 'text-cream-50';
          } else if (isPredicted) {
            ring = 'border-dashed border-rose-300';
          } else if (isFertile) {
            ring = 'border-sage-300';
          }
          return (
            <button
              key={key}
              onClick={() => setSelected(d)}
              className={[
                'relative aspect-square rounded-2xl border text-sm grid place-items-center transition',
                ring || (period ? 'border-transparent' : 'border-cream-200'),
                isSelected ? '!border-ink-900 !border-2' : '',
              ].join(' ')}
              style={{ background: bg }}
            >
              <span className={textColor}>
                {format(d, 'd')}
              </span>
              {isToday && !period && (
                <span className="absolute bottom-1 h-1 w-1 rounded-full bg-rose-500" />
              )}
              {daily && daily.symptoms.length > 0 && !period && (
                <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-sage-400" />
              )}
            </button>
          );
        })}
      </div>

      <Legend />

      {selected && (
        <div className="rounded-3xl border border-cream-200 bg-cream-50/70 p-5 animate-fade-in">
          <p className="text-xs uppercase tracking-widest text-ink-500">
            {format(selected, 'EEEE, MMM d')}
          </p>
          {selPeriod && (
            <p className="mt-2 text-ink-900">
              Period — <span className="capitalize">{selPeriod.flow}</span>
              {selPeriod.is_period_start ? ' (cycle start)' : ''}
            </p>
          )}
          {selDaily && (
            <div className="mt-2 space-y-1 text-sm text-ink-700">
              {selDaily.mood.length > 0 && (
                <p>Mood: {selDaily.mood.join(', ')}</p>
              )}
              {selDaily.symptoms.length > 0 && (
                <p>Symptoms: {selDaily.symptoms.join(', ')}</p>
              )}
              {selDaily.notes && <p className="italic">“{selDaily.notes}”</p>}
            </div>
          )}
          {!selPeriod && !selDaily && (
            <p className="mt-2 text-ink-600 text-sm">Nothing logged for this day.</p>
          )}
          <Link
            href={`/log?date=${format(selected, 'yyyy-MM-dd')}`}
            className="mt-4 inline-block text-sm text-rose-600 underline underline-offset-4"
          >
            Edit this day →
          </Link>
        </div>
      )}
    </div>
  );
}

function buildMonthGrid(month: Date): Date[] {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
  const end = endOfMonth(month);
  const days: Date[] = [];
  let d = start;
  while (d <= end || days.length % 7 !== 0) {
    days.push(d);
    d = addDays(d, 1);
  }
  return days;
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-ink-600">
      <Dot color="#C84A30" label="Logged period" />
      <Dot color="#FBE3DE" label="Predicted" outline="border-dashed border-rose-300" />
      <Dot color="#E1E9DC" label="Fertile" outline="border-sage-300" />
    </div>
  );
}

function Dot({ color, label, outline }: { color: string; label: string; outline?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={['h-3 w-3 rounded-full border', outline || 'border-transparent'].join(' ')}
        style={{ background: color }}
      />
      {label}
    </span>
  );
}
