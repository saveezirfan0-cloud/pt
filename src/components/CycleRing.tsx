import { format } from 'date-fns';
import { PHASE_DESCRIPTIONS, PHASE_LABELS, type CycleInfo } from '@/lib/cycle';

export function CycleRing({ info }: { info: CycleInfo }) {
  const size = 280;
  const r = 120;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;

  const cycleLen = info.cycleLength;
  const day = info.currentDay ?? 0;
  const progress = day && cycleLen ? Math.min(day / cycleLen, 1) : 0;

  // Phase segment offsets (in days from cycle start)
  const periodEnd = info.periodLength;
  const fertileStart = cycleLen - 14 - 5; // 5 days before ovulation
  const ovulationDay = cycleLen - 14;
  const fertileEnd = cycleLen - 14 + 1;

  const dayToArc = (d: number) => (d / cycleLen) * circ;

  const segments = [
    {
      color: '#C84A30',
      start: 0,
      end: periodEnd,
      label: 'Period',
    },
    {
      color: '#9CB18B',
      start: fertileStart,
      end: fertileEnd,
      label: 'Fertile window',
    },
  ];

  return (
    <div className="relative grain rounded-3xl bg-gradient-to-br from-cream-50 to-rose-50/60 border border-cream-200 p-6">
      <div className="flex flex-col items-center">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Track */}
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="#F5E3D1"
            strokeWidth={14}
          />
          {/* Phase segments */}
          {info.lastPeriodStart &&
            segments.map((seg, i) => {
              const len = Math.max(0, seg.end - seg.start);
              if (len <= 0) return null;
              const dasharray = `${dayToArc(len)} ${circ}`;
              const offset = -dayToArc(seg.start);
              return (
                <circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={14}
                  strokeLinecap="round"
                  strokeDasharray={dasharray}
                  strokeDashoffset={offset}
                  transform={`rotate(-90 ${cx} ${cy})`}
                  opacity={0.85}
                />
              );
            })}

          {/* Progress dot */}
          {info.lastPeriodStart && (
            <g transform={`rotate(${progress * 360 - 90} ${cx} ${cy})`}>
              <circle cx={cx + r} cy={cy} r={9} fill="#1A1410" />
              <circle cx={cx + r} cy={cy} r={4} fill="#FDF8F4" />
            </g>
          )}

          {/* Ovulation marker */}
          {info.lastPeriodStart && (
            <g
              transform={`rotate(${(ovulationDay / cycleLen) * 360 - 90} ${cx} ${cy})`}
            >
              <circle cx={cx + r} cy={cy} r={5} fill="#5E7A4D" />
            </g>
          )}
        </svg>

        <div className="-mt-[200px] text-center pointer-events-none">
          {info.lastPeriodStart ? (
            <>
              <p className="text-xs uppercase tracking-[0.3em] text-ink-500">
                {PHASE_LABELS[info.phase]}
              </p>
              <p className="font-serif text-7xl leading-none mt-1">
                {info.daysUntilNext !== null && info.daysUntilNext >= 0
                  ? info.daysUntilNext
                  : '—'}
              </p>
              <p className="text-sm text-ink-600 mt-1">
                {info.daysUntilNext === 0
                  ? 'period likely today'
                  : info.daysUntilNext && info.daysUntilNext > 0
                  ? 'days until next period'
                  : 'period may be late'}
              </p>
              {info.currentDay && (
                <p className="text-xs text-ink-500 mt-2">
                  Day {info.currentDay} of cycle
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-xs uppercase tracking-[0.3em] text-ink-500">Welcome</p>
              <p className="font-serif text-3xl leading-tight mt-2 px-6">
                Log your first period to begin
              </p>
            </>
          )}
        </div>
      </div>

      {info.lastPeriodStart && (
        <div className="mt-6 grid grid-cols-3 gap-2 text-center text-xs">
          <Stat label="Cycle" value={`${info.cycleLength}d`} />
          <Stat
            label="Next start"
            value={info.nextPeriodStart ? format(info.nextPeriodStart, 'MMM d') : '—'}
          />
          <Stat
            label="Ovulation"
            value={info.ovulationDate ? format(info.ovulationDate, 'MMM d') : '—'}
          />
        </div>
      )}

      {info.phase !== 'unknown' && PHASE_DESCRIPTIONS[info.phase] && (
        <p className="mt-5 text-sm text-ink-700 leading-relaxed text-center italic font-serif">
          “{PHASE_DESCRIPTIONS[info.phase]}”
        </p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-cream-50/80 border border-cream-200 py-2 px-1">
      <p className="text-[10px] uppercase tracking-widest text-ink-500">{label}</p>
      <p className="text-sm text-ink-900 font-medium mt-0.5">{value}</p>
    </div>
  );
}
