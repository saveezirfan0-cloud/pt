import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function Home() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect('/dashboard');

  return (
    <main className="relative min-h-dvh overflow-hidden grain">
      <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-rose-200/60 blur-3xl" />
      <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-sage-200/50 blur-3xl" />

      <div className="relative mx-auto flex min-h-dvh max-w-md flex-col px-6 py-12 safe-top safe-bottom">
        <header className="flex items-center gap-2">
          <Moon />
          <span className="text-lg tracking-wide">Luna</span>
        </header>

        <div className="flex-1 flex flex-col justify-center animate-slide-up">
          <p className="text-rose-500 uppercase tracking-[0.3em] text-xs mb-6">
            Cycle · Symptoms · Together
          </p>
          <h1 className="font-serif text-6xl leading-[0.95] tracking-tight">
            A softer way to <span className="italic text-rose-500">know</span> your body.
          </h1>
          <p className="mt-6 text-ink-700 text-lg max-w-sm">
            Log your period, track symptoms, and — if you want — share gentle updates
            with a partner who cares.
          </p>

          <div className="mt-10 space-y-3">
            <Link
              href="/auth/signup"
              className="block w-full rounded-2xl bg-rose-500 text-cream-50 text-center py-4 font-medium tracking-wide hover:bg-rose-600 transition-colors"
            >
              Create your account
            </Link>
            <Link
              href="/auth/login"
              className="block w-full rounded-2xl border border-rose-200 bg-cream-50/70 text-ink-900 text-center py-4 font-medium hover:bg-cream-100 transition-colors"
            >
              I already have one
            </Link>
          </div>
        </div>

        <footer className="pt-8 text-xs text-ink-500">
          Your data is yours. Nothing shared unless you say so.
        </footer>
      </div>
    </main>
  );
}

function Moon() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="11" fill="#C84A30" />
      <circle cx="20" cy="14" r="9" fill="#FDF8F4" />
    </svg>
  );
}
