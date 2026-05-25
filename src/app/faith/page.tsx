import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/AppShell';
import { FaithSettings } from '@/components/FaithSettings';
import { PurityTracker } from '@/components/PurityTracker';
import { MADHHAB_DEFAULTS, type IslamicSettings } from '@/lib/islamic';
import type { PeriodLog } from '@/lib/cycle';

export const dynamic = 'force-dynamic';

const FALLBACK: IslamicSettings = {
  enabled: false,
  madhhab: 'hanafi',
  ...MADHHAB_DEFAULTS.hanafi,
  ghusl_reminders: true,
} as IslamicSettings;

export default async function FaithPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const [{ data: settingsRow }, { data: periods }, { data: births }] = await Promise.all([
    supabase.from('islamic_settings').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('period_logs').select('*').eq('user_id', user.id).order('date', { ascending: true }),
    supabase
      .from('pregnancies')
      .select('end_date')
      .eq('user_id', user.id)
      .eq('status', 'ended')
      .eq('end_reason', 'birth')
      .not('end_date', 'is', null),
  ]);

  const settings: IslamicSettings = settingsRow
    ? {
        enabled: settingsRow.enabled,
        madhhab: settingsRow.madhhab,
        min_hayd: settingsRow.min_hayd,
        max_hayd: settingsRow.max_hayd,
        min_tuhr: settingsRow.min_tuhr,
        max_nifas: settingsRow.max_nifas,
        ghusl_reminders: settingsRow.ghusl_reminders,
      }
    : FALLBACK;

  const birthEvents = ((births as { end_date: string }[]) || []).map((b) => ({ date: b.end_date }));

  return (
    <AppShell>
      <div className="mb-4">
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-ink-600 hover:text-ink-900">
          <ChevronLeft size={16} /> Today
        </Link>
        <h1 className="font-serif text-4xl mt-2">
          Faith &amp; <em className="italic text-mauve-500">purity</em>
        </h1>
      </div>

      {settings.enabled && (
        <div className="mb-6">
          <PurityTracker periods={(periods as PeriodLog[]) || []} births={birthEvents} settings={settings} />
        </div>
      )}

      <FaithSettings initial={settingsRow ? settings : null} />
    </AppShell>
  );
}
