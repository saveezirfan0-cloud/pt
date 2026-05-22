import { addDays, format } from 'date-fns';
import { CalendarHeart } from 'lucide-react';
import type { CycleInfo } from '@/lib/cycle';

export function PeriodForecast({ info, months = 6 }: { info: CycleInfo; months?: number }) {
  if (!info.nextPeriodStart) return null;

  const rows: { start: Date; end: Date; fertileStart: Date; fertileEnd: Date }[] = [];
  let start = info.nextPeriodStart;
  for (let i = 0; i < months; i++) {
    const end = addDays(start, info.periodLength - 1);
    const ovulation = addDays(start, -14); // ovulation ~14d before this start
    rows.push({
      start,
      end,
      fertileStart: addDays(ovulation, -5),
      fertileEnd: addDays(ovulation, 1),
    });
    start = addDays(start, info.cycleLength);
  }

  return (
    <section className="rounded-[1.5rem] border border-cream-200 bg-cream-50/70 p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-10 w-10 rounded-2xl bg-rose-100 grid place-items-center text-rose-600">
          <CalendarHeart size={18} />
        </div>
        <div>
          <h2 className="font-serif text-xl">Upcoming periods</h2>
          <p className="text-xs text-ink-500">Based on your {info.cycleLength}-day average</p>
        </div>
      </div>
      <div className="space-y-1.5">
        {rows.map((r, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-2xl bg-cream-50 border border-cream-200 px-4 py-2.5"
          >
            <div>
              <p className="text-sm font-medium text-ink-900">
                {format(r.start, 'MMM d')} – {format(r.end, 'MMM d')}
              </p>
              <p className="text-xs text-ink-500">{format(r.start, 'EEEE')}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-sage-500">fertile</p>
              <p className="text-xs text-ink-600">
                {format(r.fertileStart, 'MMM d')} – {format(r.fertileEnd, 'MMM d')}
              </p>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-ink-500 mt-3 leading-relaxed">
        Predictions are estimates from your history, not a guarantee — and not a form of contraception.
      </p>
    </section>
  );
}
