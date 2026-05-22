import { LayoutGrid } from 'lucide-react';
import type { PeriodLog, DailyLog } from '@/lib/cycle';
import { buildSymptomPhaseMatrix, PHASES, type Phase } from '@/lib/patterns';

const PHASE_SHORT: Record<Phase, string> = {
  menstrual: 'Menst.',
  follicular: 'Follic.',
  ovulation: 'Ovul.',
  luteal: 'Luteal',
};

// rose ramp by intensity 0..1
function cellColor(ratio: number): string {
  if (ratio <= 0) return 'rgb(var(--cream-100))';
  // blend toward rose-500
  const alpha = 0.15 + ratio * 0.85;
  return `rgb(var(--rose-500) / ${alpha.toFixed(2)})`;
}

export function SymptomHeatmap({
  periods,
  dailies,
  avgPeriod,
  avgCycle,
}: {
  periods: PeriodLog[];
  dailies: DailyLog[];
  avgPeriod: number;
  avgCycle: number;
}) {
  const matrix = buildSymptomPhaseMatrix(periods, dailies, avgPeriod, avgCycle);
  const symptoms = matrix.symptoms.slice(0, 8);
  if (symptoms.length === 0) return null;

  // Normalise each symptom row to its own max so colour shows phase preference.
  return (
    <section className="rounded-[1.75rem] border border-cream-200 bg-cream-50/70 p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-2xl bg-rose-100 grid place-items-center text-rose-600">
          <LayoutGrid size={18} />
        </div>
        <div>
          <h2 className="font-serif text-xl">Symptoms by phase</h2>
          <p className="text-xs text-ink-500">Where in your cycle each symptom shows up</p>
        </div>
      </div>

      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full border-separate" style={{ borderSpacing: '4px' }}>
          <thead>
            <tr>
              <th className="text-left text-[10px] uppercase tracking-widest text-ink-500 font-normal" />
              {PHASES.map((p) => (
                <th
                  key={p}
                  className="text-[10px] uppercase tracking-wide text-ink-500 font-normal pb-1 text-center"
                >
                  {PHASE_SHORT[p]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {symptoms.map((s) => {
              const row = matrix.counts[s];
              const rowMax = Math.max(row.menstrual, row.follicular, row.ovulation, row.luteal, 1);
              return (
                <tr key={s}>
                  <td className="text-sm text-ink-800 capitalize pr-2 whitespace-nowrap">{s}</td>
                  {PHASES.map((p) => {
                    const ratio = row[p] / rowMax;
                    return (
                      <td key={p} className="text-center">
                        <div
                          className="h-9 min-w-[44px] rounded-lg grid place-items-center text-[11px] font-medium"
                          style={{
                            background: cellColor(ratio),
                            color: ratio > 0.55 ? 'rgb(var(--cream-50))' : 'rgb(var(--ink-600))',
                          }}
                          title={`${row[p]} times in ${p}`}
                        >
                          {row[p] || ''}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-ink-500 mt-3">
        Darker = that symptom happens more often in that phase. Numbers are how many times you logged it.
      </p>
    </section>
  );
}
