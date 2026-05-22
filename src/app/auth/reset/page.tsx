'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setHasSession(!!user);
      setChecking(false);
    })();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (password.length < 6) {
      setErr('Use at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setErr('Those passwords don’t match.');
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setDone(true);
    setTimeout(() => {
      router.replace('/dashboard');
      router.refresh();
    }, 900);
  }

  return (
    <main className="min-h-dvh flex items-center justify-center px-6 safe-top safe-bottom">
      <div className="w-full max-w-sm animate-slide-up">
        {checking ? (
          <p className="text-ink-600 text-sm">Checking your link…</p>
        ) : !hasSession ? (
          <>
            <h1 className="font-serif text-4xl leading-tight">This link is no longer valid.</h1>
            <p className="text-ink-600 mt-3 leading-relaxed">
              Password reset links expire after a short time and can only be used once.
            </p>
            <Link
              href="/auth/forgot"
              className="mt-6 inline-block w-full text-center rounded-2xl bg-rose-500 text-cream-50 py-4 font-medium"
            >
              Request a new link
            </Link>
          </>
        ) : done ? (
          <>
            <div className="h-12 w-12 rounded-2xl bg-sage-100 grid place-items-center text-sage-500">
              <Check size={22} />
            </div>
            <h1 className="font-serif text-4xl mt-4">Password updated.</h1>
            <p className="text-ink-600 mt-2">Taking you in…</p>
          </>
        ) : (
          <>
            <h1 className="font-serif text-5xl leading-tight">
              Set a new <em className="italic text-rose-500">password</em>.
            </h1>
            <p className="text-ink-600 mt-2">Almost done — choose something you&apos;ll remember.</p>

            <form onSubmit={onSubmit} className="mt-8 space-y-4">
              <label className="block">
                <span className="text-xs uppercase tracking-widest text-ink-600">New password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  className="mt-1 w-full rounded-xl border border-rose-200 bg-cream-50 px-4 py-3 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-200 transition"
                />
              </label>
              <label className="block">
                <span className="text-xs uppercase tracking-widest text-ink-600">Confirm password</span>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  required
                  className="mt-1 w-full rounded-xl border border-rose-200 bg-cream-50 px-4 py-3 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-200 transition"
                />
              </label>
              {err && (
                <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-3">
                  {err}
                </p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-rose-500 text-cream-50 py-4 font-medium disabled:opacity-60 hover:bg-rose-600 transition"
              >
                {loading ? 'Saving…' : 'Update password'}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
