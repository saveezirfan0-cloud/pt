import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/AppShell';
import { FloImport } from '@/components/FloImport';

export const dynamic = 'force-dynamic';

export default async function ImportPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  return (
    <AppShell>
      <div className="mb-5">
        <p className="text-xs uppercase tracking-[0.25em] text-ink-500">Migrate</p>
        <h1 className="font-serif text-4xl mt-1">
          Bring your <em className="italic text-rose-500">history</em>.
        </h1>
        <p className="text-ink-600 text-sm mt-3 leading-relaxed">
          Switching from Flo? Import your period history, symptoms, and moods so your predictions
          pick up right where you left off.
        </p>
      </div>
      <FloImport />
    </AppShell>
  );
}
