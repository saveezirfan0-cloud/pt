'use client';

import { useMemo, useState } from 'react';
import {
  addDays,
  endOfMonth,
  format,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
  addMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Droplets, Sparkles } from 'lucide-react';
import type { PeriodLog } from '@/lib/cycle';
import {
  classifiedDayMap,
  classifyEpisodes,
  STATE_META,
  stateForDate,
  todayStatus,
  type DayState,
  type Episode,
  type IslamicSettings,
} from '@/lib/islamic';

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function PurityTracker({
  periods,
  births,
  settings,
}: {
  periods: PeriodLog[];
  births: { date: string }[];
  settings: IslamicSettings;
}) {
  const [cursor, setCursor] = useState(() => new Date());

  const episodes = useMemo(
    () => classifyEpisodes(periods, births, settings),
    [periods, births, settings]
  );
  const map = useMemo(() => classifiedDayMap(episodes), [episodes]);
  const status = useMemo(() => todayStatus(todayISO(), map, episodes), [map, episodes]);

  const grid = useMemo(() => buildMonthGrid(cursor), [cursor]);

  return (
    <div className="space-y-6">
      {/* Today status */}
      <div
        className="relative overflow-hidden grain rounded-[2rem] border p-6"
        style={{ borderColor: STATE_META[status.state].color }}
      >
        <p className="text-[11px] uppercase tracking-[0.3em] text-ink-500">Today</p>
        <p className="font-serif text-3xl text-ink-900 leading-tight mt-1">{status.headline}</p>
        <p className="text-sm text-ink-600 mt-2 leading-relaxed">{status.detail}</p>
        <span
          className="mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium"
          style={{ background: STATE_META[status.state].color, color: 'rgb(var(--cream-50))' }}
        >
          {STATE_META[status.state].label}
        </span>
      </div>

      {/* Ghusl reminder */}
      {status.ghuslDue && settings.ghusl_reminders && (
        <div className="rounded-[1.5rem] border border-sage-200 bg-sage-50 p-5 flex items-start gap-3">
          <div className="h-10 w-10 rounded-2xl bg-sage-100 grid place-items-center text-sage-500 shrink-0">
            <Droplets size={18} />
          </div>
          <div>
            <p className="font-medium text-ink-900">Your bleeding appears to have ended</p>
            <p className="text-sm text-ink-600 mt-1 leading-relaxed">
              When you&apos;re sure it has stopped, performing ghusl returns you to purity so you can
              resume prayer and fasting.
            </p>
          </div>
        </div>
      )}

      {/* Month view with 4-state colouring */}
      <section className="rounded-[1.75rem] border border-cream-200 bg-cream-50/70 p-5">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCursor(subMonths(cursor, 1))}
            className="h-9 w-9 rounded-full border border-cream-200 grid place-items-center text-ink-700 hover:bg-cream-100"
            aria-label="Previous month"
          >
            <ChevronLeft size={18} />
          </button>
          <h2 className="font-serif text-2xl">{format(cursor, 'MMMM yyyy')}</h2>
          <button
            onClick={() => setCursor(addMonths(cursor, 1))}
            className="h-9 w-9 rounded-full border border-cream-200 grid place-items-center text-ink-700 hover:bg-cream-100"
            aria-label="Next month"
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-[10px] uppercase tracking-widest text-ink-500 text-center mb-1">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={i} className="py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {grid.map((d) => {
            const key = format(d, 'yyyy-MM-dd');
            const state = stateForDate(key, map);
            const inMonth = isSameMonth(d, cursor);
            const isToday = key === todayISO();
            const filled = state !== 'purity';
            return (
              <div
                key={key}
                className={[
                  'relative aspect-square rounded-2xl grid place-items-center text-sm border',
                  filled ? 'border-transparent' : 'border-cream-200',
                  isToday ? '!border-ink-900 !border-2' : '',
                  inMonth ? '' : 'opacity-35',
                ].join(' ')}
                style={filled ? { background: STATE_META[state].color } : undefined}
                title={STATE_META[state].label}
              >
                <span className={filled && state !== 'istihada' ? 'text-cream-50' : 'text-ink-700'}>
                  {format(d, 'd')}
                </span>
              </div>
            );
          })}
        </div>
        <Legend />
      </section>

      {/* Recent episodes */}
      {episodes.length > 0 && (
        <section className="rounded-[1.75rem] border border-cream-200 bg-cream-50/70 p-5">
          <h2 className="font-serif text-xl mb-3">Recent bleeding</h2>
          <div className="space-y-2">
            {[...episodes].reverse().slice(0, 6).map((ep, i) => (
              <EpisodeRow key={i} ep={ep} />
            ))}
          </div>
        </section>
      )}

      <p className="text-xs text-ink-500 leading-relaxed">
        These are organisational estimates based on your logs and your settings — not religious
        rulings. Schools of fiqh differ on menstruation, nifas, istihada, and purity. Please consult
        a qualified scholar for anything you&apos;re unsure about.
      </p>
    </div>
  );
}

function EpisodeRow({ ep }: { ep: Episode }) {
  const meta = STATE_META[ep.type];
  const total = ep.haydOrNifasDays.length + ep.istihadaDays.length;
  return (
    <div className="rounded-2xl border border-cream-200 bg-cream-50 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full" style={{ background: meta.color }} />
          <p className="text-sm font-medium text-ink-900">{meta.label}</p>
        </div>
        <p className="text-xs text-ink-500">
          {format(parseISO(ep.start), 'MMM d')} – {format(parseISO(ep.end), 'MMM d, yyyy')}
        </p>
      </div>
      <p className="text-xs text-ink-500 mt-1">
        {ep.haydOrNifasDays.length} day{ep.haydOrNifasDays.length === 1 ? '' : 's'} counted
        {ep.istihadaDays.length > 0 && (
          <>
            {' '}
            · <span className="text-sage-500">{ep.istihadaDays.length} beyond max (istihada?)</span>
          </>
        )}
        {' '}· {total} total
      </p>
    </div>
  );
}

function Legend() {
  const states: DayState[] = ['hayd', 'nifas', 'istihada', 'purity'];
  return (
    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-ink-600">
      {states.map((s) => (
        <span key={s} className="inline-flex items-center gap-1.5">
          <span
            className="h-3 w-3 rounded-full border border-cream-200"
            style={{ background: STATE_META[s].color }}
          />
          {STATE_META[s].label}
        </span>
      ))}
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
