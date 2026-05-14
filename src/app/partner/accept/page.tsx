'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, Heart, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

function AcceptInner() {
  const router = useRouter();
  const params = useSearchParams();
  const code = params.get('code') || '';
  const [status, setStatus] = useState<'idle' | 'working' | 'ok' | 'error'>('idle');
  const [err, setErr] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        setNeedsAuth(true);
        return;
      }
    })();
  }, []);

  async function accept() {
    setStatus('working');
    setErr(null);
    const supabase = createClient();
    const { data, error } = await supabase.rpc('accept_partner_invite', { p_code: code });
    if (error) {
      setStatus('error');
      setErr(error.message);
      return;
    }
    if (!data?.ok) {
      setStatus('error');
      setErr(prettyError(data?.error));
      return;
    }
    setStatus('ok');
    setTimeout(() => router.push('/dashboard'), 800);
  }

  if (!code) {
    return (
      <Wrap>
        <p className="text-ink-700">No invite code provided.</p>
        <Link href="/" className="mt-4 inline-block text-rose-600 underline">
          Go home
        </Link>
      </Wrap>
    );
  }

  if (needsAuth) {
    return (
      <Wrap>
        <h1 className="font-serif text-4xl">You&apos;ve been <em className="italic text-rose-500">invited</em>.</h1>
        <p className="text-ink-700 mt-3">
          Sign in or create an account first, then you can accept this invitation.
        </p>
        <div className="mt-6 space-y-3">
          <Link
            href={`/auth/signup?next=/partner/accept?code=${code}`}
            className="block w-full rounded-2xl bg-rose-500 text-cream-50 text-center py-4 font-medium"
          >
            Create account
          </Link>
          <Link
            href={`/auth/login?next=/partner/accept?code=${code}`}
            className="block w-full rounded-2xl border border-rose-200 text-center py-4 font-medium"
          >
            Sign in
          </Link>
        </div>
      </Wrap>
    );
  }

  return (
    <Wrap>
      <div className="h-12 w-12 rounded-2xl bg-rose-100 grid place-items-center text-rose-500">
        <Heart size={22} />
      </div>
      <h1 className="font-serif text-4xl mt-4">A partner wants to <em className="italic text-rose-500">share</em>.</h1>
      <p className="text-ink-700 mt-3">
        Accepting connects your accounts. You&apos;ll be able to see what they choose to
        share — period dates, symptoms, predictions — and they&apos;ll see the same from you,
        unless you opt out in settings.
      </p>

      {status === 'idle' && (
        <button
          onClick={accept}
          className="mt-6 w-full rounded-2xl bg-rose-500 text-cream-50 py-4 font-medium"
        >
          Accept connection
        </button>
      )}
      {status === 'working' && (
        <p className="mt-6 text-ink-600 text-sm">Connecting…</p>
      )}
      {status === 'ok' && (
        <p className="mt-6 text-sage-500 bg-sage-50 border border-sage-200 rounded-lg p-3 flex items-center gap-2 text-sm">
          <Check size={16} /> Connected. Taking you in…
        </p>
      )}
      {status === 'error' && (
        <>
          <p className="mt-6 text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-3 flex items-center gap-2 text-sm">
            <X size={16} /> {err}
          </p>
          <Link href="/dashboard" className="mt-4 inline-block text-rose-600 underline">
            Go to dashboard
          </Link>
        </>
      )}
    </Wrap>
  );
}

function Wrap({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-dvh flex items-center justify-center px-6 safe-top safe-bottom">
      <div className="w-full max-w-sm animate-slide-up">{children}</div>
    </main>
  );
}

function prettyError(code?: string) {
  switch (code) {
    case 'invalid_code': return 'This invite link is not valid.';
    case 'invite_accepted': return 'This invite was already used.';
    case 'invite_revoked': return 'This invite was revoked.';
    case 'invite_expired':
    case 'expired': return 'This invite has expired.';
    case 'cannot_accept_own_invite': return 'You cannot accept your own invite.';
    case 'not_authenticated': return 'You need to sign in first.';
    default: return code || 'Something went wrong.';
  }
}

export default function AcceptPage() {
  return (
    <Suspense>
      <AcceptInner />
    </Suspense>
  );
}
