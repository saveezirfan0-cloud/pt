import { format } from 'date-fns';
import { PHASE_DESCRIPTIONS, PHASE_LABELS, type CycleInfo } from '@/lib/cycle';

export function CycleRing({ info }: { info: CycleInfo }) {
  const size = 280;
  const r = 118;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const stroke = 16;

  const cycleLen = info.cycleLength || 28;
  const day = info.currentDay ?? 0;
  const progress = day && cycleLen ? Math.min(day / cycleLen, 1) : 0;

  const periodEnd = info.periodLength;
  const fertileStart = cycleLen - 14 - 5;
  const fertileEnd = cycleLen - 14 + 1;
  const ovulationDay = cycleLen - 14;

  const dayToArc = (d: number) => (d / cycleLen) * circ;

  const segments = [
    { id: 'period', start: 0, end: periodEnd },
    { id: 'fertile', start: fertileStart, end: fertileEnd },
  ];

  const hasData = !!info.lastPeriodStart;

  return (
    <div className="relative overflow-hidden grain rounded-[2rem] border border-cream-200 bg-gradient-to-br from-cream-50 via-cream-50 to-rose-50/60 p-6 shadow-[0_18px_50px_-24px_rgb(var(--rose-500)/0.35)]">
      {/* contained, responsive ring */}
      <div className="relative mx-auto aspect-square w-full max-w-[280px]">
        <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full">
          <defs>
            <linearGradient id="periodGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgb(var(--rose-400))" />
              <stop offset="100%" stopColor="rgb(var(--rose-600))" />
            </linearGradient>
            <linearGradient id="fertileGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgb(var(--sage-300))" />
              <stop offset="100%" stopColor="rgb(var(--sage-500))" />
            </linearGradient>
          </defs>

          {/* track */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgb(var(--cream-200))" strokeWidth={stroke} />

          {hasData &&
            segments.map((seg) => {
              const len = Math.max(0, seg.end - seg.start);
              if (len <= 0) return null;
              return (
                <circle
                  key={seg.id}
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill="none"
                  stroke={`url(#${seg.id}Grad)`}
                  strokeWidth={stroke}
                  strokeLinecap="round"
                  strokeDasharray={`${dayToArc(len)} ${circ}`}
                  strokeDashoffset={-dayToArc(seg.start)}
                  transform={`rotate(-90 ${cx} ${cy})`}
                />
              );
            })}

          {/* ovulation marker */}
          {hasData && (
            <g transform={`rotate(${(ovulationDay / cycleLen) * 360 - 90} ${cx} ${cy})`}>
              <circle cx={cx + r} cy={cy} r={5} fill="rgb(var(--sage-500))" />
            </g>
          )}

          {/* today dot, gently breathing */}
          {hasData && (
            <g transform={`rotate(${progress * 360 - 90} ${cx} ${cy})`} className="origin-center animate-breathe">
              <circle cx={cx + r} cy={cy} r={10} fill="rgb(var(--ink-900))" />
              <circle cx={cx + r} cy={cy} r={4} fill="rgb(var(--cream-50))" />
            </g>
          )}
        </svg>

        {/* centered overlay — absolute, so it never pushes siblings */}
        <div className="pointer-events-none absolute inset-0 grid place-items-center px-10 text-center">
          {hasData ? (
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-ink-500">
                {PHASE_LABELS[info.phase]}
              </p>
              <p className="font-serif text-[4.5rem] leading-none mt-1 text-ink-900">
                {info.daysUntilNext !== null && info.daysUntilNext >= 0 ? info.daysUntilNext : '—'}
              </p>
              <p className="text-sm text-ink-600 mt-1">
                {info.daysUntilNext === 0
                  ? 'period likely today'
                  : info.daysUntilNext && info.daysUntilNext > 0
                  ? 'days until next period'
                  : 'period may be late'}
              </p>
              {info.currentDay && (
                <p className="text-xs text-ink-500 mt-2">Day {info.currentDay} of cycle</p>
              )}
            </div>
          ) : (
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-ink-500">Welcome</p>
              <p className="font-serif text-[1.7rem] leading-tight mt-2 text-ink-900">
                Log your first period to begin
              </p>
            </div>
          )}
        </div>
      </div>

      {hasData && (
        <div className="mt-6 grid grid-cols-3 gap-2 text-center">
          <Stat label="Cycle" value={`${info.cycleLength}d`} />
          <Stat label="Next start" value={info.nextPeriodStart ? format(info.nextPeriodStart, 'MMM d') : '—'} />
          <Stat label="Ovulation" value={info.ovulationDate ? format(info.ovulationDate, 'MMM d') : '—'} />
        </div>
      )}

      {info.phase !== 'unknown' && PHASE_DESCRIPTIONS[info.phase] && (
        <p className="mt-5 text-sm text-ink-700 leading-relaxed text-center italic font-serif">
          &ldquo;{PHASE_DESCRIPTIONS[info.phase]}&rdquo;
        </p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-cream-50/80 border border-cream-200 py-2.5 px-1">
      <p className="text-[10px] uppercase tracking-widest text-ink-500">{label}</p>
      <p className="text-sm text-ink-900 font-medium mt-0.5">{value}</p>
    </div>
  );
}
