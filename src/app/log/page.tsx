import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/AppShell';
import { LogForm } from '@/components/LogForm';

export const dynamic = 'force-dynamic';

export default async function LogPage({
  searchParams,
}: {
  searchParams: { date?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const date = searchParams.date || new Date().toISOString().slice(0, 10);
  const [{ data: period }, { data: daily }] = await Promise.all([
    supabase.from('period_logs').select('*').eq('user_id', user.id).eq('date', date).maybeSingle(),
    supabase.from('daily_logs').select('*').eq('user_id', user.id).eq('date', date).maybeSingle(),
  ]);

  return (
    <AppShell>
      <div className="mb-5">
        <p className="text-xs uppercase tracking-[0.25em] text-ink-500">Log entry</p>
        <h1 className="font-serif text-4xl mt-1">How are you <em className="italic text-rose-500">today</em>?</h1>
      </div>
      <Suspense>
        <LogForm initialDate={date} initialPeriod={period} initialDaily={daily} />
      </Suspense>
    </AppShell>
  );
}
