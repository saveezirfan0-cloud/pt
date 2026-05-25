import { format } from 'date-fns';
import { CheckCircle2, CircleDot, Sparkles } from 'lucide-react';
import type { FertilityWindow, Goal } from '@/lib/fertility';

const METHOD_NOTE: Record<FertilityWindow['method'], string> = {
  'bbt+signs': 'Confirmed by your temperature shift.',
  lh: 'Estimated from your LH test — confirm with a temperature rise.',
  mucus: 'Estimated from your cervical-mucus peak.',
  estimate: 'Calendar estimate — log BBT, mucus, or LH to refine it.',
  none: '',
};

export function FertilityStatus({
  window,
  goal,
  today = new Date(),
}: {
  window: FertilityWindow;
  goal: Goal | null;
  today?: Date;
}) {
  if (!window.ovulation) return null;
  const inFertile =
    window.fertileStart != null &&
    window.fertileEnd != null &&
    today >= window.fertileStart &&
    today <= window.fertileEnd;

  const headline = inFertile
    ? goal === 'avoid'
      ? 'Fertile window — higher chance of conception'
      : 'Fertile window is open'
    : window.confirmed
    ? 'Ovulation confirmed this cycle'
    : 'Outside your estimated fertile window';

  return (
    <div className="relative overflow-hidden grain rounded-[2rem] border border-mauve-200 bg-gradient-to-br from-mauve-50 via-rose-50 to-cream-50 p-6">
      <div className="flex items-center gap-2 text-mauve-500">
        {window.confirmed ? <CheckCircle2 size={18} /> : <CircleDot size={18} />}
        <p className="text-[11px] uppercase tracking-[0.25em]">Fertility</p>
      </div>
      <p className="font-serif text-3xl text-ink-900 leading-tight mt-2">{headline}</p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Stat
          label="Fertile window"
          value={
            window.fertileStart && window.fertileEnd
              ? `${format(window.fertileStart, 'MMM d')} – ${format(window.fertileEnd, 'MMM d')}`
              : '—'
          }
        />
        <Stat label="Peak day" value={window.peakDay ? format(window.peakDay, 'MMM d') : '—'} />
        <Stat
          label={window.confirmed ? 'Ovulation (confirmed)' : 'Ovulation (est.)'}
          value={format(window.ovulation, 'MMM d')}
        />
        <Stat
          label="Implantation window"
          value={
            window.implantationStart && window.implantationEnd
              ? `${format(window.implantationStart, 'MMM d')} – ${format(window.implantationEnd, 'MMM d')}`
              : '—'
          }
        />
      </div>

      <p className="mt-4 text-xs text-ink-600 flex items-start gap-1.5">
        <Sparkles size={13} className="mt-0.5 shrink-0 text-mauve-400" />
        {METHOD_NOTE[window.method]}
      </p>

      {goal === 'avoid' && (
        <p className="mt-3 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-3 leading-relaxed">
          Luna is not a contraceptive. Fertility-awareness for birth control only works reliably with
          proper training and a validated method — please learn it with a certified instructor and use
          backup protection.
        </p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-cream-50/70 border border-cream-200 p-3">
      <p className="text-[10px] uppercase tracking-widest text-ink-500">{label}</p>
      <p className="text-sm font-medium text-ink-900 mt-1">{value}</p>
    </div>
  );
}
