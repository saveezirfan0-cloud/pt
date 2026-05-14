import { format } from 'date-fns';
import type { CycleInfo, DailyLog } from '@/lib/cycle';

export function CycleStats({ info, dailies }: { info: CycleInfo; dailies: DailyLog[] }) {
  if (info.recentCycles.length === 0) {
    return (
      <div className="rounded-3xl border border-cream-200 bg-cream-50/70 p-6 text-center">
        <p className="font-serif text-2xl">No insights yet</p>
        <p className="text-ink-600 text-sm mt-2">
          Log at least two cycle starts to see your trends here.
        </p>
      </div>
    );
  }

  // Symptom frequency
  const symptomCount = new Map<string, number>();
  const moodCount = new Map<string, number>();
  for (const d of dailies) {
    for (const s of d.symptoms) symptomCount.set(s, (symptomCount.get(s) || 0) + 1);
    for (const m of d.mood) moodCount.set(m, (moodCount.get(m) || 0) + 1);
  }
  const topSymptoms = [...symptomCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topMoods = [...moodCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  const cycles = info.recentCycles;
  const max = Math.max(...cycles.map((c) => c.length), info.cycleLength);
  const min = Math.min(...cycles.map((c) => c.length), info.cycleLength);
  const range = Math.max(max - min, 1);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <Card label="Avg cycle" value={`${info.cycleLength} days`} />
        <Card label="Avg period" value={`${info.periodLength} days`} />
        <Card
          label="Tracked cycles"
          value={`${cycles.length}`}
        />
        <Card
          label="Last started"
          value={info.lastPeriodStart ? format(info.lastPeriodStart, 'MMM d') : '—'}
        />
      </div>

      <section className="rounded-3xl border border-cream-200 bg-cream-50/70 p-5">
        <h2 className="font-serif text-2xl">Cycle length history</h2>
        <div className="mt-4 flex items-end gap-2 h-32">
          {cycles.map((c, i) => {
            const h = 30 + ((c.length - min) / range) * 80;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-lg bg-gradient-to-t from-rose-400 to-rose-300"
                  style={{ height: `${h}%` }}
                  title={`${c.length} days`}
                />
                <span className="text-[10px] text-ink-500">{format(c.start, 'MMM')}</span>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-ink-500 mt-2">
          Range {min}–{max} days. Cycles outside 21–35 are worth mentioning to a clinician.
        </p>
      </section>

      {topSymptoms.length > 0 && (
        <section className="rounded-3xl border border-cream-200 bg-cream-50/70 p-5">
          <h2 className="font-serif text-2xl">Most logged symptoms</h2>
          <ul className="mt-3 space-y-2">
            {topSymptoms.map(([s, n]) => (
              <Row key={s} label={s} count={n} max={topSymptoms[0][1]} color="#C84A30" />
            ))}
          </ul>
        </section>
      )}

      {topMoods.length > 0 && (
        <section className="rounded-3xl border border-cream-200 bg-cream-50/70 p-5">
          <h2 className="font-serif text-2xl">Most logged moods</h2>
          <ul className="mt-3 space-y-2">
            {topMoods.map(([m, n]) => (
              <Row key={m} label={m} count={n} max={topMoods[0][1]} color="#5E7A4D" />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-cream-200 bg-cream-50/70 p-4">
      <p className="text-xs uppercase tracking-widest text-ink-500">{label}</p>
      <p className="font-serif text-3xl mt-1">{value}</p>
    </div>
  );
}

function Row({
  label,
  count,
  max,
  color,
}: {
  label: string;
  count: number;
  max: number;
  color: string;
}) {
  return (
    <li>
      <div className="flex justify-between text-sm text-ink-700">
        <span className="capitalize">{label}</span>
        <span className="text-ink-500">{count}×</span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-cream-200 overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${(count / max) * 100}%`, background: color }}
        />
      </div>
    </li>
  );
}
