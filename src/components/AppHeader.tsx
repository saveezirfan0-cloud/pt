'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export function AppHeader({ name }: { name: string | null }) {
  const router = useRouter();
  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/');
    router.refresh();
  }
  const greeting = greetingFor();
  return (
    <header className="flex items-center justify-between mb-4">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-ink-500">{greeting}</p>
        <h1 className="font-serif text-3xl leading-none mt-1">
          {name ? <>Hi, <em className="italic text-rose-500">{name}</em></> : 'Welcome'}
        </h1>
      </div>
      <button
        onClick={signOut}
        className="rounded-full h-10 w-10 grid place-items-center border border-cream-200 bg-cream-50/70 hover:bg-cream-100 text-ink-700"
        aria-label="Sign out"
      >
        <LogOut size={18} />
      </button>
    </header>
  );
}

function greetingFor() {
  const h = new Date().getHours();
  if (h < 5) return 'Late night';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}
