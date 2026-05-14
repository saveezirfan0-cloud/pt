import Link from 'next/link';
import { format } from 'date-fns';
import { Heart } from 'lucide-react';
import { PHASE_LABELS, type CycleInfo } from '@/lib/cycle';

export function PartnerCycleCard({ name, info }: { name: string; info: CycleInfo }) {
  return (
    <Link
      href="/partner"
      className="block rounded-3xl bg-gradient-to-br from-sage-50 to-cream-50 border border-sage-100 p-5 hover:shadow-sm transition"
    >
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-2xl bg-sage-100 grid place-items-center text-sage-500">
          <Heart size={18} strokeWidth={1.75} />
        </div>
        <div className="flex-1">
          <p className="text-xs uppercase tracking-widest text-ink-500">Your partner</p>
          <p className="font-serif text-xl">{name}</p>
        </div>
      </div>
      {info.phase === 'unknown' ? (
        <p className="mt-4 text-sm text-ink-600">No cycle data shared yet.</p>
      ) : (
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Mini label="Phase" value={PHASE_LABELS[info.phase]} />
          <Mini
            label="Day"
            value={info.currentDay ? `${info.currentDay}` : '—'}
          />
          <Mini
            label="Next period"
            value={info.nextPeriodStart ? format(info.nextPeriodStart, 'MMM d') : '—'}
          />
        </div>
      )}
    </Link>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-cream-50/80 border border-cream-200 py-2">
      <p className="text-[10px] uppercase tracking-widest text-ink-500">{label}</p>
      <p className="text-sm text-ink-900 font-medium truncate px-1">{value}</p>
    </div>
  );
}
