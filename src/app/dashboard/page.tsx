import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/AppShell';
import { AppHeader } from '@/components/AppHeader';
import { CycleRing } from '@/components/CycleRing';
import { Affirmation } from '@/components/Affirmation';
import { PartnerCycleCard } from '@/components/PartnerCycleCard';
import { QuickLog } from '@/components/QuickLog';
import { TodayInsights } from '@/components/TodayInsights';
import { PredictionSync } from '@/components/PredictionSync';
import { PregnancyHero } from '@/components/PregnancyHero';
import { computeCycleInfo, type PeriodLog } from '@/lib/cycle';
import { computePregnancyInfo, type Pregnancy } from '@/lib/pregnancy';
import {
  classifiedDayMap,
  classifyEpisodes,
  STATE_META,
  todayStatus,
  type IslamicSettings,
} from '@/lib/islamic';
import { computeStreak } from '@/lib/streak';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Baby, Flower2, Moon } from 'lucide-react';
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

  const [{ data: profile }, { data: periods }, { data: partners }, { data: dailyDates }, { data: pregnancy }, { data: islamicRow }] =
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
      supabase
        .from('pregnancies')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle(),
      supabase.from('islamic_settings').select('*').eq('user_id', user.id).maybeSingle(),
    ]);

  // Supporters (partners with no cycle of their own) get the Together view.
  if (profile?.account_kind === 'supporter') redirect('/together');

  const pregnancyInfo = pregnancy ? computePregnancyInfo(pregnancy as Pregnancy) : null;

  // Faith status (only when Islamic mode is enabled).
  let faith: { headline: string; label: string; color: string; href: string } | null = null;
  if (islamicRow?.enabled) {
    const settings = islamicRow as unknown as IslamicSettings;
    const allPeriods = (periods as PeriodLog[]) || [];
    // Births for nifas detection are fetched lazily only when enabled.
    const { data: births } = await supabase
      .from('pregnancies')
      .select('end_date')
      .eq('user_id', user.id)
      .eq('status', 'ended')
      .eq('end_reason', 'birth')
      .not('end_date', 'is', null);
    const birthEvents = ((births as { end_date: string }[]) || []).map((b) => ({ date: b.end_date }));
    const episodes = classifyEpisodes(allPeriods, birthEvents, settings);
    const map = classifiedDayMap(episodes);
    const todayKey = formatISO(new Date(), { representation: 'date' });
    const st = todayStatus(todayKey, map, episodes);
    faith = {
      headline: st.headline,
      label: STATE_META[st.state].label,
      color: STATE_META[st.state].color,
      href: '/faith',
    };
  }

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
  let partnerPregnancy: { name: string; info: ReturnType<typeof computePregnancyInfo> } | null = null;
  if (partners && partners.length > 0) {
    const partnerId = partners[0].partner_id;
    const [{ data: pProfile }, { data: pPeriods }, { data: pPreg }] = await Promise.all([
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
      supabase
        .from('pregnancies')
        .select('*')
        .eq('user_id', partnerId)
        .eq('status', 'active')
        .maybeSingle(),
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
      if (pPreg) {
        partnerPregnancy = {
          name: pProfile.display_name || 'Partner',
          info: computePregnancyInfo(pPreg as Pregnancy),
        };
      }
    }
  }

  return (
    <AppShell>
      <AppHeader name={profile?.display_name ?? null} streak={streak} />
      <PredictionSync
        nextPeriodISO={info.nextPeriodStart ? formatISO(info.nextPeriodStart, { representation: 'date' }) : null}
      />
      <div className="stagger space-y-6">
        {pregnancyInfo ? (
          <PregnancyHero info={pregnancyInfo} babyName={(pregnancy as Pregnancy).baby_name} compact />
        ) : null}
        {faith && (
          <Link
            href={faith.href}
            className="flex items-center gap-3 rounded-[1.5rem] border p-4 transition hover:-translate-y-0.5"
            style={{ borderColor: faith.color }}
          >
            <div className="h-10 w-10 rounded-2xl bg-mauve-100 grid place-items-center text-mauve-500 shrink-0">
              <Moon size={18} />
            </div>
            <div className="flex-1">
              <p className="font-medium text-ink-900 text-sm">{faith.headline}</p>
              <p className="text-xs text-ink-500">{faith.label}</p>
            </div>
          </Link>
        )}
        <CycleRing info={info} />
        <Affirmation info={info} />
        {info.phase !== 'unknown' && <TodayInsights info={info} />}
        <QuickLog />
        {!pregnancyInfo && (
          <Link
            href="/fertility"
            className="flex items-center gap-3 rounded-[1.5rem] border border-cream-200 bg-cream-50/70 p-4 hover:bg-cream-100 transition"
          >
            <div className="h-10 w-10 rounded-2xl bg-mauve-100 grid place-items-center text-mauve-500">
              <Flower2 size={18} />
            </div>
            <div className="flex-1">
              <p className="font-medium text-ink-900 text-sm">Fertility &amp; conception</p>
              <p className="text-xs text-ink-500">Chart BBT, confirm ovulation, see your fertile window.</p>
            </div>
          </Link>
        )}
        {!pregnancyInfo && (
          <Link
            href="/pregnancy/start"
            className="flex items-center gap-3 rounded-[1.5rem] border border-mauve-200 bg-mauve-50/60 p-4 hover:bg-mauve-50 transition"
          >
            <div className="h-10 w-10 rounded-2xl bg-mauve-100 grid place-items-center text-mauve-500">
              <Baby size={18} />
            </div>
            <div className="flex-1">
              <p className="font-medium text-ink-900 text-sm">Expecting? Track your pregnancy</p>
              <p className="text-xs text-ink-500">Week-by-week growth, kicks, contractions &amp; more.</p>
            </div>
          </Link>
        )}
        {partnerData && <PartnerCycleCard name={partnerData.name} info={partnerData.info} />}
        {partnerPregnancy && (
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-mauve-500 mb-2 px-1">
              {partnerPregnancy.name}&apos;s pregnancy
            </p>
            <PregnancyHero info={partnerPregnancy.info} href="" />
          </div>
        )}
      </div>
    </AppShell>
  );
}
