import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Baby, Bell, Calendar, Flower2, Heart, HeartHandshake } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/AppShell';
import { computeCycleInfo, PHASE_LABELS, type PeriodLog } from '@/lib/cycle';
import { computePregnancyInfo, countdownText, type Pregnancy } from '@/lib/pregnancy';
import { cycleGuidance, pregnancySupport } from '@/lib/partner-support';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function TogetherPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  // Find an owner this user supports (a connection where the other side is the owner).
  const { data: conns } = await supabase
    .from('partner_connections')
    .select('partner_id, role, nickname, share_periods, share_symptoms, share_predictions, share_pregnancy')
    .eq('user_id', user.id);

  // The person we're supporting: a connection whose row role is 'owner'
  // (meaning partner_id is the tracked person) — fall back to first connection.
  const supporting =
    (conns || []).find((c) => c.role === 'owner') || (conns || [])[0] || null;

  if (!supporting) {
    return (
      <AppShell>
        <Header />
        <div className="rounded-3xl border border-dashed border-cream-200 p-8 text-center mt-4">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-rose-100 grid place-items-center text-rose-500">
            <HeartHandshake size={22} />
          </div>
          <p className="font-serif text-2xl mt-3">No one to support yet</p>
          <p className="text-ink-600 text-sm mt-2">
            When your partner shares their tracking with you, their cycle and how to support them will
            appear here.
          </p>
          <Link
            href="/partner"
            className="mt-5 inline-block rounded-2xl bg-rose-500 text-cream-50 px-5 py-3 text-sm font-medium"
          >
            Connect with a partner
          </Link>
        </div>
      </AppShell>
    );
  }

  const partnerId = supporting.partner_id;
  const name = supporting.nickname || 'your partner';

  const [{ data: pProfile }, { data: pPeriods }, { data: pPreg }] = await Promise.all([
    supabase.from('profiles').select('display_name, average_cycle_length, average_period_length').eq('id', partnerId).maybeSingle(),
    supabase.from('period_logs').select('*').eq('user_id', partnerId).order('date', { ascending: true }),
    supabase.from('pregnancies').select('*').eq('user_id', partnerId).eq('status', 'active').maybeSingle(),
  ]);

  const displayName = supporting.nickname || pProfile?.display_name || 'your partner';
  const info = computeCycleInfo(
    (pPeriods as PeriodLog[]) || [],
    pProfile?.average_cycle_length || 28,
    pProfile?.average_period_length || 5
  );
  const guidance = cycleGuidance(info);
  const pregnancyInfo = pPreg && supporting.share_pregnancy ? computePregnancyInfo(pPreg as Pregnancy) : null;
  const pregTips = pregnancyInfo ? pregnancySupport(pregnancyInfo) : null;

  return (
    <AppShell>
      <Header />

      <div className="stagger space-y-6 mt-2">
        {/* Pregnancy takes priority if active & shared */}
        {pregnancyInfo && pregTips ? (
          <>
            <div className="relative overflow-hidden grain rounded-[2rem] border border-mauve-200 bg-gradient-to-br from-mauve-50 via-rose-50 to-cream-50 p-6">
              <div className="flex items-center gap-2 text-mauve-500">
                <Baby size={18} />
                <p className="text-[11px] uppercase tracking-[0.25em]">Supporting {displayName}</p>
              </div>
              <p className="font-serif text-3xl text-ink-900 mt-2">
                Week {pregnancyInfo.week} · {countdownText(pregnancyInfo)}
              </p>
              <p className="text-sm text-ink-600 mt-1">Trimester {pregnancyInfo.trimester}</p>
            </div>
            <HelpCard title={`How to support her — ${pregTips.title}`} tips={pregTips.tips} icon={Heart} />
          </>
        ) : (
          <>
            {/* Cycle status */}
            <div
              className="relative overflow-hidden grain rounded-[2rem] border p-6"
              style={{ borderColor: 'rgb(var(--rose-200))' }}
            >
              <div className="flex items-center gap-2 text-rose-500">
                <Heart size={18} />
                <p className="text-[11px] uppercase tracking-[0.25em]">Supporting {displayName}</p>
              </div>
              <p className="font-serif text-3xl text-ink-900 mt-2">{guidance.phaseTitle}</p>
              <p className="text-xs uppercase tracking-widest text-ink-500 mt-1">
                {PHASE_LABELS[info.phase]} phase
              </p>
              <p className="text-sm text-ink-700 mt-3 leading-relaxed">{guidance.whatsHappening}</p>
            </div>

            {/* Heads-up */}
            {guidance.headsUp && (
              <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50 p-4 flex items-start gap-3">
                <div className="h-9 w-9 rounded-2xl bg-rose-100 grid place-items-center text-rose-600 shrink-0">
                  <Bell size={16} />
                </div>
                <div>
                  <p className="text-sm font-medium text-ink-900">Heads-up</p>
                  <p className="text-sm text-ink-600 mt-0.5">{guidance.headsUp}</p>
                </div>
              </div>
            )}

            {/* How to help */}
            <HelpCard title="How to support her this week" tips={guidance.howToHelp} icon={HeartHandshake} />

            {/* Key dates (only if predictions shared) */}
            {supporting.share_predictions && info.nextPeriodStart && (
              <section className="rounded-[1.5rem] border border-cream-200 bg-cream-50/70 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-2xl bg-sage-100 grid place-items-center text-sage-500">
                    <Calendar size={18} />
                  </div>
                  <h2 className="font-serif text-xl">Key dates</h2>
                </div>
                <Row label="Next period (estimated)" value={format(info.nextPeriodStart, 'EEE, MMM d')} />
                {info.fertileWindowStart && info.fertileWindowEnd && (
                  <Row
                    label="Fertile window"
                    value={`${format(info.fertileWindowStart, 'MMM d')} – ${format(info.fertileWindowEnd, 'MMM d')}`}
                  />
                )}
                <p className="text-xs text-ink-500 mt-3">Estimates from her shared data — they can shift.</p>
              </section>
            )}
          </>
        )}

        <p className="text-xs text-ink-500 leading-relaxed text-center">
          You only see what {displayName} chooses to share. These are gentle, general suggestions — she
          knows herself best, so listen first.
        </p>
      </div>
    </AppShell>
  );
}

function Header() {
  return (
    <div className="mb-1">
      <p className="text-xs uppercase tracking-[0.25em] text-rose-500">Together</p>
      <h1 className="font-serif text-4xl mt-1">
        Supporting <em className="italic text-rose-500">her</em>
      </h1>
    </div>
  );
}

function HelpCard({
  title,
  tips,
  icon: Icon,
}: {
  title: string;
  tips: string[];
  icon: typeof Heart;
}) {
  return (
    <section className="rounded-[1.5rem] border border-cream-200 bg-cream-50/70 p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-10 w-10 rounded-2xl bg-rose-100 grid place-items-center text-rose-600">
          <Icon size={18} />
        </div>
        <h2 className="font-serif text-xl">{title}</h2>
      </div>
      <ul className="space-y-2">
        {tips.map((t, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-ink-700">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-rose-400 shrink-0" />
            {t}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-ink-600">{label}</span>
      <span className="text-sm font-medium text-ink-900">{value}</span>
    </div>
  );
}
