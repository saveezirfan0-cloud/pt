import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/AppShell';
import { PregnancyHero } from '@/components/PregnancyHero';
import { FetalWeekExplorer } from '@/components/FetalWeekExplorer';
import { WeightTracker } from '@/components/WeightTracker';
import { PregnancyTools, EndPregnancy } from '@/components/PregnancyTools';
import { computePregnancyInfo, type Pregnancy } from '@/lib/pregnancy';

export const dynamic = 'force-dynamic';

export default async function PregnancyPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: pregnancy } = await supabase
    .from('pregnancies')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  // No active pregnancy → send to setup.
  if (!pregnancy) redirect('/pregnancy/start');

  const p = pregnancy as Pregnancy;
  const info = computePregnancyInfo(p);

  const { data: weights } = await supabase
    .from('pregnancy_weights')
    .select('id, date, weight_kg')
    .eq('pregnancy_id', p.id)
    .order('date', { ascending: true });

  return (
    <AppShell>
      <div className="mb-4 flex items-center justify-between">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-ink-600 hover:text-ink-900"
        >
          <ChevronLeft size={16} /> Today
        </Link>
        <p className="text-xs uppercase tracking-[0.25em] text-mauve-500">
          {p.baby_name || 'Your pregnancy'}
        </p>
      </div>

      <div className="stagger space-y-6">
        <PregnancyHero info={info} babyName={p.baby_name} href="" />
        <PregnancyTools />
        <FetalWeekExplorer currentWeek={info.week} />
        <WeightTracker pregnancyId={p.id} initial={(weights as any) || []} />
        <EndPregnancy pregnancyId={p.id} />
      </div>
    </AppShell>
  );
}
