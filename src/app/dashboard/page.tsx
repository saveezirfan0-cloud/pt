import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/AppShell';
import { AppHeader } from '@/components/AppHeader';
import { CycleRing } from '@/components/CycleRing';
import { Affirmation } from '@/components/Affirmation';
import { PartnerCycleCard } from '@/components/PartnerCycleCard';
import { QuickLog } from '@/components/QuickLog';
import { TodayInsights } from '@/components/TodayInsights';
import { PredictionSync } from '@/components/PredictionSync';
import { computeCycleInfo, type PeriodLog } from '@/lib/cycle';
import { computeStreak } from '@/lib/streak';
import { redirect } from 'next/navigation';
import { subDays, formatISO } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const since = formatISO(subDays(new Date(), 365), { representation: 'date' });
  const streakSince = formatISO(subDays(new Date(), 120), { representation: 'date' });

  const [{ data: profile }, { data: periods }, { data: partners }, { data: dailyDates }] =
    await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      supabase
        .from('period_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', since)
        .order('date', { ascending: true }),
      supabase.from('partner_connections').select('partner_id').eq('user_id', user.id),
      supabase
        .from('daily_logs')
        .select('date')
        .eq('user_id', user.id)
        .gte('date', streakSince),
    ]);

  const info = computeCycleInfo(
    (periods as PeriodLog[]) || [],
    profile?.average_cycle_length || 28,
    profile?.average_period_length || 5
  );

  // Streak counts any check-in: a period log OR a daily (symptoms/mood) log.
  const checkInDates = [
    ...((periods as { date: string }[]) || []).map((p) => p.date),
    ...((dailyDates as { date: string }[]) || []).map((d) => d.date),
  ];
  const streak = computeStreak(checkInDates);

  let partnerData: { name: string; info: ReturnType<typeof computeCycleInfo> } | null = null;
  if (partners && partners.length > 0) {
    const partnerId = partners[0].partner_id;
    const [{ data: pProfile }, { data: pPeriods }] = await Promise.all([
      supabase
        .from('profiles')
        .select('display_name, average_cycle_length, average_period_length')
        .eq('id', partnerId)
        .maybeSingle(),
      supabase
        .from('period_logs')
        .select('*')
        .eq('user_id', partnerId)
        .gte('date', since)
        .order('date', { ascending: true }),
    ]);
    if (pProfile) {
      partnerData = {
        name: pProfile.display_name || 'Partner',
        info: computeCycleInfo(
          (pPeriods as PeriodLog[]) || [],
          pProfile.average_cycle_length || 28,
          pProfile.average_period_length || 5
        ),
      };
    }
  }

  return (
    <AppShell>
      <AppHeader name={profile?.display_name ?? null} streak={streak} />
      <PredictionSync
        nextPeriodISO={info.nextPeriodStart ? formatISO(info.nextPeriodStart, { representation: 'date' }) : null}
      />
      <div className="stagger space-y-6">
        <CycleRing info={info} />
        <Affirmation info={info} />
        {info.phase !== 'unknown' && <TodayInsights info={info} />}
        <QuickLog />
        {partnerData && <PartnerCycleCard name={partnerData.name} info={partnerData.info} />}
      </div>
    </AppShell>
  );
}
