import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/AppShell';
import { FertilityStatus } from '@/components/FertilityStatus';
import { BBTChart } from '@/components/BBTChart';
import { FertilityGoal } from '@/components/FertilityGoal';
import { computeCycleInfo, type PeriodLog } from '@/lib/cycle';
import {
  currentCycleStart,
  detectOvulation,
  resolveFertilityWindow,
  type FertilityLog,
  type Goal,
} from '@/lib/fertility';

export const dynamic = 'force-dynamic';

export default async function FertilityPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const [{ data: profile }, { data: periods }, { data: fertility }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('period_logs').select('*').eq('user_id', user.id).order('date', { ascending: true }),
    supabase.from('fertility_logs').select('*').eq('user_id', user.id).order('date', { ascending: true }),
  ]);

  const allPeriods = (periods as PeriodLog[]) || [];
  const fLogs = (fertility as FertilityLog[]) || [];
  const info = computeCycleInfo(
    allPeriods,
    profile?.average_cycle_length || 28,
    profile?.average_period_length || 5
  );
  const tempUnit = (profile?.temp_unit as 'c' | 'f') || 'c';
  const goal = (profile?.fertility_goal as Goal) || null;

  const cycleStart = currentCycleStart(allPeriods) ?? info.lastPeriodStart;
  const window = cycleStart
    ? resolveFertilityWindow(cycleStart, info.cycleLength, fLogs)
    : null;
  const ovulation = cycleStart ? detectOvulation(cycleStart, fLogs) : null;

  return (
    <AppShell>
      <div className="mb-4 flex items-center justify-between">
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-ink-600 hover:text-ink-900">
          <ChevronLeft size={16} /> Today
        </Link>
        <Link
          href="/fertility/log"
          className="inline-flex items-center gap-1.5 rounded-full bg-rose-500 text-cream-50 px-4 py-2 text-sm font-medium hover:bg-rose-600"
        >
          <Plus size={15} /> Log signs
        </Link>
      </div>
      <h1 className="font-serif text-4xl mb-5">
        <em className="italic text-mauve-500">Fertility</em>
      </h1>

      <div className="stagger space-y-6">
        {window && <FertilityStatus window={window} goal={goal} />}
        {cycleStart && (
          <BBTChart
            cycleStart={cycleStart}
            logs={fLogs}
            coverlineC={ovulation?.coverlineC ?? null}
            ovulationDate={window?.ovulation ? toISO(window.ovulation) : null}
            tempUnit={tempUnit}
          />
        )}
        <FertilityGoal initial={goal} />
        <p className="text-xs text-ink-500 leading-relaxed">
          These estimates use your logged signs and standard fertility-awareness models. They are not
          medical advice and not a contraceptive. If you&apos;re using fertility awareness to prevent
          pregnancy, learn a validated method with a certified instructor.
        </p>
      </div>
    </AppShell>
  );
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
