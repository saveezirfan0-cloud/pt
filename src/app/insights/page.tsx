import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/AppShell';
import { CycleStats } from '@/components/CycleStats';
import { CycleHistory } from '@/components/CycleHistory';
import { PeriodForecast } from '@/components/PeriodForecast';
import { AIInsights } from '@/components/AIInsights';
import { SymptomHeatmap } from '@/components/SymptomHeatmap';
import { generateInsights } from '@/lib/patterns';
import { computeCycleInfo, type DailyLog, type PeriodLog } from '@/lib/cycle';

export const dynamic = 'force-dynamic';

export default async function InsightsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  // Full history powers cycle statistics and the complete cycle list.
  const [{ data: profile }, { data: periods }, { data: dailies }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('period_logs').select('*').eq('user_id', user.id).order('date', { ascending: true }),
    supabase.from('daily_logs').select('*').eq('user_id', user.id).order('date', { ascending: true }),
  ]);

  const allPeriods = (periods as PeriodLog[]) || [];
  const allDailies = (dailies as DailyLog[]) || [];
  const info = computeCycleInfo(
    allPeriods,
    profile?.average_cycle_length || 28,
    profile?.average_period_length || 5
  );
  const insights = generateInsights(info, allPeriods, allDailies);

  return (
    <AppShell>
      <div className="mb-5">
        <p className="text-xs uppercase tracking-[0.25em] text-ink-500">Insights</p>
        <h1 className="font-serif text-4xl mt-1">Your <em className="italic text-rose-500">patterns</em>.</h1>
      </div>
      <div className="space-y-6">
        <AIInsights insights={insights} />
        <CycleHistory periods={allPeriods} />
        <SymptomHeatmap
          periods={allPeriods}
          dailies={allDailies}
          avgPeriod={info.periodLength}
          avgCycle={info.cycleLength}
        />
        <PeriodForecast info={info} />
        <CycleStats info={info} dailies={allDailies} />
      </div>
    </AppShell>
  );
}
