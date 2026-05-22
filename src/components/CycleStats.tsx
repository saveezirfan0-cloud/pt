import type { CycleInfo, DailyLog } from '@/lib/cycle';

export function CycleStats({ info, dailies }: { info: CycleInfo; dailies: DailyLog[] }) {
  // Symptom & mood frequency across all logged days.
  const symptomCount = new Map<string, number>();
  const moodCount = new Map<string, number>();
  for (const d of dailies) {
    for (const s of d.symptoms) symptomCount.set(s, (symptomCount.get(s) || 0) + 1);
    for (const m of d.mood) moodCount.set(m, (moodCount.get(m) || 0) + 1);
  }
  const topSymptoms = [...symptomCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const topMoods = [...moodCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

  if (topSymptoms.length === 0 && topMoods.length === 0) return null;

  return (
    <div className="space-y-5">
      {topSymptoms.length > 0 && (
        <section className="rounded-[1.5rem] border border-cream-200 bg-cream-50/70 p-5">
          <h2 className="font-serif text-xl">Most logged symptoms</h2>
          <ul className="mt-3 space-y-2">
            {topSymptoms.map(([s, n]) => (
              <Row key={s} label={s} count={n} max={topSymptoms[0][1]} color="rgb(var(--rose-500))" />
            ))}
          </ul>
        </section>
      )}

      {topMoods.length > 0 && (
        <section className="rounded-[1.5rem] border border-cream-200 bg-cream-50/70 p-5">
          <h2 className="font-serif text-xl">Most logged moods</h2>
          <ul className="mt-3 space-y-2">
            {topMoods.map(([m, n]) => (
              <Row key={m} label={m} count={n} max={topMoods[0][1]} color="rgb(var(--sage-400))" />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Row({ label, count, max, color }: { label: string; count: number; max: number; color: string }) {
  return (
    <li>
      <div className="flex justify-between text-sm text-ink-700">
        <span className="capitalize">{label}</span>
        <span className="text-ink-500">{count}×</span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-cream-200 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${(count / max) * 100}%`, background: color }} />
      </div>
    </li>
  );
}
