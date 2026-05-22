'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const supabase = createClient();
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (typeof window !== 'undefined' ? window.location.origin : '');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?next=/auth/reset`,
    });
    setLoading(false);
    if (error) {
      setErr(error.message);
      return;
    }
    // Always show success (don't reveal whether an account exists).
    setSent(true);
  }

  return (
    <main className="min-h-dvh flex items-center justify-center px-6 safe-top safe-bottom">
      <div className="w-full max-w-sm animate-slide-up">
        <Link href="/auth/login" className="text-sm text-ink-600 hover:text-ink-900">
          ← back to sign in
        </Link>

        {sent ? (
          <>
            <div className="mt-6 h-12 w-12 rounded-2xl bg-sage-100 grid place-items-center text-sage-500">
              <Check size={22} />
            </div>
            <h1 className="font-serif text-4xl mt-4 leading-tight">Check your inbox.</h1>
            <p className="text-ink-600 mt-3 leading-relaxed">
              If an account exists for <span className="font-medium">{email}</span>, we&apos;ve sent a
              link to reset your password. It expires in an hour.
            </p>
            <p className="text-sm text-ink-500 mt-6">
              Didn&apos;t get it?{' '}
              <button
                onClick={() => setSent(false)}
                className="text-rose-600 underline underline-offset-4"
              >
                Try again
              </button>
            </p>
          </>
        ) : (
          <>
            <h1 className="font-serif text-5xl mt-6 leading-tight">
              Forgot your <em className="italic text-rose-500">password</em>?
            </h1>
            <p className="text-ink-600 mt-2">
              Enter your email and we&apos;ll send you a reset link.
            </p>

            <form onSubmit={onSubmit} className="mt-8 space-y-4">
              <label className="block">
                <span className="text-xs uppercase tracking-widest text-ink-600">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
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
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
