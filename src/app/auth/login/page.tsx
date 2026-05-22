'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/dashboard';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(() => prettyAuthError(params.get('error')));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setErr(error.message);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <main className="min-h-dvh flex items-center justify-center px-6 safe-top safe-bottom">
      <div className="w-full max-w-sm animate-slide-up">
        <Link href="/" className="text-sm text-ink-600 hover:text-ink-900">← back</Link>
        <h1 className="font-serif text-5xl mt-6 leading-tight">Welcome back.</h1>
        <p className="text-ink-600 mt-2">Sign in to continue tracking.</p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
            required
          />
          <Field
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            required
          />
          <div className="text-right -mt-1">
            <Link
              href="/auth/forgot"
              className="text-xs text-rose-600 hover:text-rose-700 underline underline-offset-4"
            >
              Forgot password?
            </Link>
          </div>
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
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-ink-600 text-sm">
          New here?{' '}
          <Link
            href={`/auth/signup${next !== '/dashboard' ? `?next=${encodeURIComponent(next)}` : ''}`}
            className="text-rose-600 underline underline-offset-4"
          >
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}

function prettyAuthError(code: string | null): string | null {
  if (!code) return null;
  const c = code.toLowerCase();
  if (c.includes('expired')) return 'That link has expired. Please request a new one.';
  if (c.includes('already') && c.includes('confirm')) return null;
  if (c === 'auth_callback_failed' || c.includes('invalid') || c.includes('pkce')) {
    return "We couldn't confirm that link. It may have expired or already been used — try signing in, or request a new email.";
  }
  // Otherwise surface Supabase's own (already human-readable) message.
  return decodeURIComponent(code);
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}

function Field(props: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-widest text-ink-600">{props.label}</span>
      <input
        type={props.type || 'text'}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        required={props.required}
        autoComplete={props.autoComplete}
        className="mt-1 w-full rounded-xl border border-rose-200 bg-cream-50 px-4 py-3 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-200 transition"
      />
    </label>
  );
}
