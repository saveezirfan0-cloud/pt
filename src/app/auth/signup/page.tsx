'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function SignupPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo: `${
          process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
        }/auth/callback`,
      },
    });
    setLoading(false);

    if (error) {
      setErr(error.message);
      return;
    }

    if (data.session) {
      router.replace('/dashboard');
      router.refresh();
    } else {
      setMsg('Check your inbox to confirm your email, then sign in.');
    }
  }

  return (
    <main className="min-h-dvh flex items-center justify-center px-6 safe-top safe-bottom">
      <div className="w-full max-w-sm animate-slide-up">
        <Link href="/" className="text-sm text-ink-600 hover:text-ink-900">← back</Link>
        <h1 className="font-serif text-5xl mt-6 leading-tight">Start your <em className="italic text-rose-500">cycle</em>.</h1>
        <p className="text-ink-600 mt-2">It takes less than a minute.</p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <Field label="Name" value={displayName} onChange={setDisplayName} required />
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
            autoComplete="new-password"
            required
          />
          {err && (
            <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-3">
              {err}
            </p>
          )}
          {msg && (
            <p className="text-sm text-sage-500 bg-sage-50 border border-sage-200 rounded-lg p-3">
              {msg}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-rose-500 text-cream-50 py-4 font-medium disabled:opacity-60 hover:bg-rose-600 transition"
          >
            {loading ? 'Creating…' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-ink-600 text-sm">
          Already have one?{' '}
          <Link href="/auth/login" className="text-rose-600 underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </div>
    </main>
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
