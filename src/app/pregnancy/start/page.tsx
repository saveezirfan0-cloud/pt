import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/AppShell';
import { PregnancySetup } from '@/components/PregnancySetup';

export const dynamic = 'force-dynamic';

export default async function PregnancyStartPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  // Already pregnant → go straight to the hub.
  const { data: existing } = await supabase
    .from('pregnancies')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();
  if (existing) redirect('/pregnancy');

  return (
    <AppShell>
      <div className="mb-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-ink-600 hover:text-ink-900"
        >
          <ChevronLeft size={16} /> Today
        </Link>
      </div>
      <PregnancySetup />
    </AppShell>
  );
}
