import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/AppShell';
import { FertilityLogForm } from '@/components/FertilityLogForm';
import type { FertilityLog } from '@/lib/fertility';

export const dynamic = 'force-dynamic';

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default async function FertilityLogPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const [{ data: profile }, { data: existing }] = await Promise.all([
    supabase.from('profiles').select('temp_unit').eq('id', user.id).maybeSingle(),
    supabase.from('fertility_logs').select('*').eq('user_id', user.id).eq('date', todayISO()).maybeSingle(),
  ]);

  return (
    <AppShell>
      <div className="mb-4">
        <Link href="/fertility" className="inline-flex items-center gap-1 text-sm text-ink-600 hover:text-ink-900">
          <ChevronLeft size={16} /> Fertility
        </Link>
        <h1 className="font-serif text-4xl mt-2">
          Log <em className="italic text-mauve-500">signs</em>
        </h1>
      </div>
      <FertilityLogForm
        initial={(existing as FertilityLog) ?? null}
        tempUnit={(profile?.temp_unit as 'c' | 'f') || 'c'}
      />
    </AppShell>
  );
}
