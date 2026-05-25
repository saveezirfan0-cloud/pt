import { redirect } from 'next/navigation';
import Link from 'next/link';
import { HeartHandshake } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/AppShell';
import { PartnerPanel } from '@/components/PartnerPanel';

export const dynamic = 'force-dynamic';

export default async function PartnerPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const [{ data: invites }, { data: connections }] = await Promise.all([
    supabase
      .from('partner_invites')
      .select('*')
      .eq('inviter_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('partner_connections')
      .select('*, partner:partner_id (id, display_name, email)')
      .eq('user_id', user.id),
  ]);

  // Does this user support a partner (i.e. has an 'owner'-role connection)?
  const supportsSomeone = (connections || []).some((c: any) => c.role === 'owner');

  return (
    <AppShell>
      <div className="mb-5">
        <p className="text-xs uppercase tracking-[0.25em] text-ink-500">Sharing</p>
        <h1 className="font-serif text-4xl mt-1">Your <em className="italic text-rose-500">partner</em>.</h1>
        <p className="text-ink-600 text-sm mt-3 leading-relaxed">
          Share your cycle with someone you trust. They&apos;ll see what you choose, nothing
          more. You can revoke access anytime.
        </p>
      </div>

      {supportsSomeone && (
        <Link
          href="/together"
          className="mb-6 flex items-center gap-3 rounded-[1.5rem] border border-rose-200 bg-rose-50/60 p-4 hover:bg-rose-50 transition"
        >
          <div className="h-10 w-10 rounded-2xl bg-rose-100 grid place-items-center text-rose-600">
            <HeartHandshake size={18} />
          </div>
          <div className="flex-1">
            <p className="font-medium text-ink-900 text-sm">Supporting a partner</p>
            <p className="text-xs text-ink-500">See their cycle and how to support them.</p>
          </div>
        </Link>
      )}

      <PartnerPanel
        userId={user.id}
        invites={invites || []}
        connections={(connections as any) || []}
      />
    </AppShell>
  );
}
