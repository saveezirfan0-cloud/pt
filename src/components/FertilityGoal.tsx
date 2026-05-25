'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Goal } from '@/lib/fertility';

const GOALS: { id: Goal; label: string; hint: string }[] = [
  { id: 'ttc', label: 'Trying to conceive', hint: 'Highlight my most fertile days' },
  { id: 'avoid', label: 'Avoiding pregnancy', hint: 'Show fertile days to be cautious' },
  { id: 'observe', label: 'Just learning', hint: 'Track my signs, no agenda' },
];

export function FertilityGoal({ initial }: { initial: Goal | null }) {
  const router = useRouter();
  const [goal, setGoal] = useState<Goal | null>(initial);
  const [saving, setSaving] = useState(false);

  async function choose(g: Goal) {
    setGoal(g);
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) await supabase.from('profiles').update({ fertility_goal: g }).eq('id', user.id);
    setSaving(false);
    router.refresh();
  }

  return (
    <section className="rounded-[1.5rem] border border-cream-200 bg-cream-50/70 p-5">
      <h2 className="font-serif text-xl mb-1">Your goal</h2>
      <p className="text-xs text-ink-500 mb-3">Tailors how Luna frames your fertile window.</p>
      <div className="space-y-2">
        {GOALS.map((g) => (
          <button
            key={g.id}
            onClick={() => choose(g.id)}
            className={[
              'w-full text-left rounded-2xl border p-4 transition',
              goal === g.id
                ? 'border-mauve-400 bg-mauve-50'
                : 'border-cream-200 bg-cream-50 hover:bg-cream-100',
            ].join(' ')}
          >
            <p className="font-medium text-ink-900 text-sm">{g.label}</p>
            <p className="text-xs text-ink-500 mt-0.5">{g.hint}</p>
          </button>
        ))}
      </div>
      {saving && <p className="text-xs text-ink-500 mt-2">Saving…</p>}
    </section>
  );
}
