import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/AppShell';
import { ContractionTimer } from '@/components/ContractionTimer';

export const dynamic = 'force-dynamic';

export default async function ContractionsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: pregnancy } = await supabase
    .from('pregnancies')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  const { data: contractions } = await supabase
    .from('contractions')
    .select('id, started_at, ended_at, duration_seconds')
    .eq('user_id', user.id)
    .order('started_at', { ascending: false })
    .limit(30);

  return (
    <AppShell>
      <div className="mb-4">
        <Link
          href={pregnancy ? '/pregnancy' : '/dashboard'}
          className="inline-flex items-center gap-1 text-sm text-ink-600 hover:text-ink-900"
        >
          <ChevronLeft size={16} /> Back
        </Link>
        <h1 className="font-serif text-4xl mt-2">
          Contraction <em className="italic text-mauve-500">timer</em>
        </h1>
      </div>
      <ContractionTimer pregnancyId={pregnancy?.id ?? null} initial={(contractions as any) || []} />
    </AppShell>
  );
}
