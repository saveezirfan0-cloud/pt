import { format } from 'date-fns';
import { Droplet, Flower2, Sparkles, Wind } from 'lucide-react';
import type { CycleInfo } from '@/lib/cycle';

const phaseIcons = {
  menstrual: Droplet,
  follicular: Wind,
  ovulation: Sparkles,
  luteal: Flower2,
  unknown: Sparkles,
} as const;

const phaseTitle = {
  menstrual: 'Rest and replenish',
  follicular: 'Fresh energy is building',
  ovulation: 'Peak window',
  luteal: 'Slowing down gracefully',
  unknown: '',
} as const;

export function TodayInsights({ info }: { info: CycleInfo }) {
  if (info.phase === 'unknown') return null;
  const Icon = phaseIcons[info.phase];
  const today = new Date();
  return (
    <section className="rounded-[1.5rem] border border-cream-200 bg-cream-50/70 p-5">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-2xl bg-rose-100 grid place-items-center text-rose-600">
          <Icon size={20} strokeWidth={1.75} />
        </div>
        <div className="flex-1">
          <p className="text-xs uppercase tracking-widest text-ink-500">{format(today, 'EEEE, MMM d')}</p>
          <p className="font-serif text-xl leading-tight text-ink-900">{phaseTitle[info.phase]}</p>
        </div>
      </div>
    </section>
  );
}
