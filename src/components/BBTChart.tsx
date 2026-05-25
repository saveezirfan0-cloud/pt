'use client';

import { useMemo } from 'react';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { C_TO_F, MUCUS_FERTILITY, type FertilityLog } from '@/lib/fertility';

/**
 * Sympto-thermal chart: BBT line with coverline, plus mucus and LH markers
 * along a cycle-day axis. Pure SVG, theme-aware.
 */
export function BBTChart({
  cycleStart,
  logs,
  coverlineC,
  ovulationDate,
  tempUnit,
}: {
  cycleStart: Date;
  logs: FertilityLog[];
  coverlineC: number | null;
  ovulationDate: string | null;
  tempUnit: 'c' | 'f';
}) {
  const data = useMemo(() => {
    const inCycle = logs
      .filter((l) => parseISO(l.date) >= cycleStart && l.bbt_c != null)
      .sort((a, b) => a.date.localeCompare(b.date));
    return inCycle.map((l) => ({
      day: differenceInCalendarDays(parseISO(l.date), cycleStart) + 1,
      date: l.date,
      temp: tempUnit === 'f' ? C_TO_F(l.bbt_c as number) : (l.bbt_c as number),
      mucus: l.mucus,
      lh: l.lh,
    }));
  }, [logs, cycleStart, tempUnit]);

  if (data.length < 2) {
    return (
      <section className="rounded-[1.5rem] border border-cream-200 bg-cream-50/70 p-6 text-center">
        <p className="font-serif text-xl">Your temperature chart</p>
        <p className="text-sm text-ink-600 mt-2">
          Log your basal temperature for a few mornings and your chart — with the coverline and
          thermal shift — will appear here.
        </p>
      </section>
    );
  }

  const W = 320;
  const H = 200;
  const padX = 28;
  const padY = 20;
  const maxDay = Math.max(...data.map((d) => d.day), 14);
  const temps = data.map((d) => d.temp);
  const coverline = coverlineC != null ? (tempUnit === 'f' ? C_TO_F(coverlineC) : coverlineC) : null;
  const allTemps = coverline != null ? [...temps, coverline] : temps;
  const minT = Math.min(...allTemps) - 0.1;
  const maxT = Math.max(...allTemps) + 0.1;
  const rangeT = maxT - minT || 1;

  const x = (day: number) => padX + ((day - 1) / Math.max(maxDay - 1, 1)) * (W - padX * 2);
  const y = (t: number) => padY + (1 - (t - minT) / rangeT) * (H - padY * 2);

  const path = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(d.day).toFixed(1)} ${y(d.temp).toFixed(1)}`).join(' ');
  const ovDay = ovulationDate ? differenceInCalendarDays(parseISO(ovulationDate), cycleStart) + 1 : null;

  return (
    <section className="rounded-[1.5rem] border border-cream-200 bg-cream-50/70 p-5">
      <h2 className="font-serif text-xl mb-1">Temperature chart</h2>
      <p className="text-xs text-ink-500 mb-3">BBT (°{tempUnit.toUpperCase()}) with coverline and signs</p>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {/* ovulation band */}
        {ovDay != null && (
          <rect
            x={x(ovDay) - 6}
            y={padY}
            width={12}
            height={H - padY * 2}
            fill="rgb(var(--sage-300) / 0.25)"
          />
        )}
        {/* coverline */}
        {coverline != null && (
          <line
            x1={padX}
            x2={W - padX}
            y1={y(coverline)}
            y2={y(coverline)}
            stroke="rgb(var(--sage-400))"
            strokeWidth={1}
            strokeDasharray="4 3"
          />
        )}
        {/* temp line */}
        <path d={path} fill="none" stroke="rgb(var(--rose-500))" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {/* points + mucus/LH markers */}
        {data.map((d, i) => (
          <g key={i}>
            <circle cx={x(d.day)} cy={y(d.temp)} r={2.5} fill="rgb(var(--rose-500))" />
            {d.mucus && MUCUS_FERTILITY[d.mucus] >= 3 && (
              <circle cx={x(d.day)} cy={H - 8} r={3} fill="rgb(var(--mauve-400))" />
            )}
            {(d.lh === 'peak' || d.lh === 'positive') && (
              <text x={x(d.day)} y={H - 4} textAnchor="middle" fontSize="7" fill="rgb(var(--ink-600))">
                LH
              </text>
            )}
          </g>
        ))}
      </svg>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-ink-600">
        <Legend color="rgb(var(--rose-500))" label="BBT" />
        <Legend color="rgb(var(--sage-400))" label="Coverline" />
        <Legend color="rgb(var(--mauve-400))" label="Fertile mucus" />
        {ovDay != null && <Legend color="rgb(var(--sage-300))" label="Ovulation" />}
      </div>
    </section>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
