import { redirect } from 'next/navigation';
import { formatISO, subDays } from 'date-fns';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/AppShell';
import { CycleStats } from '@/components/CycleStats';
import { computeCycleInfo, type DailyLog, type PeriodLog } from '@/lib/cycle';

export const dynamic = 'force-dynamic';

export default async function InsightsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const since = formatISO(subDays(new Date(), 365), { representation: 'date' });

  const [{ data: profile }, { data: periods }, { data: dailies }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('period_logs').select('*').eq('user_id', user.id).gte('date', since),
    supabase.from('daily_logs').select('*').eq('user_id', user.id).gte('date', since),
  ]);

  const info = computeCycleInfo(
    (periods as PeriodLog[]) || [],
    profile?.average_cycle_length || 28,
    profile?.average_period_length || 5
  );

  return (
    <AppShell>
      <div className="mb-5">
        <p className="text-xs uppercase tracking-[0.25em] text-ink-500">Insights</p>
        <h1 className="font-serif text-4xl mt-1">Your <em className="italic text-rose-500">patterns</em>.</h1>
      </div>
      <CycleStats info={info} dailies={(dailies as DailyLog[]) || []} />
    </AppShell>
  );
}
