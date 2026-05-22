import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/AppShell';
import { SettingsPanel } from '@/components/SettingsPanel';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  return (
    <AppShell>
      <div className="mb-5">
        <p className="text-xs uppercase tracking-[0.25em] text-ink-500">You</p>
        <h1 className="font-serif text-4xl mt-1">
          <em className="italic text-rose-500">Settings</em>
        </h1>
      </div>
      <SettingsPanel />
    </AppShell>
  );
}
