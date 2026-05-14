import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/AppShell';
import { AppHeader } from '@/components/AppHeader';
import { CycleRing } from '@/components/CycleRing';
import { PartnerCycleCard } from '@/components/PartnerCycleCard';
import { QuickLog } from '@/components/QuickLog';
import { TodayInsights } from '@/components/TodayInsights';
import { computeCycleInfo, type PeriodLog } from '@/lib/cycle';
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

  const [{ data: profile }, { data: periods }, { data: partners }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase
      .from('period_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', since)
      .order('date', { ascending: true }),
    supabase
      .from('partner_connections')
      .select('partner_id')
      .eq('user_id', user.id),
  ]);

  const info = computeCycleInfo(
    (periods as PeriodLog[]) || [],
    profile?.average_cycle_length || 28,
    profile?.average_period_length || 5
  );

  // Partner cycle preview (first partner if any)
  let partnerData: {
    name: string;
    info: ReturnType<typeof computeCycleInfo>;
  } | null = null;
  if (partners && partners.length > 0) {
    const partnerId = partners[0].partner_id;
    const [{ data: pProfile }, { data: pPeriods }] = await Promise.all([
      supabase.from('profiles').select('display_name, average_cycle_length, average_period_length').eq('id', partnerId).maybeSingle(),
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
      <AppHeader name={profile?.display_name ?? null} />
      <div className="mt-4 animate-slide-up">
        <CycleRing info={info} />
      </div>
      <div className="mt-6">
        <TodayInsights info={info} />
      </div>
      <div className="mt-6">
        <QuickLog />
      </div>
      {partnerData && (
        <div className="mt-6">
          <PartnerCycleCard name={partnerData.name} info={partnerData.info} />
        </div>
      )}
    </AppShell>
  );
}
