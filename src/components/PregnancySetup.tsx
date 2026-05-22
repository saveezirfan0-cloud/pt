'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Baby, Heart } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { deriveLmp, dueDateFromLmp, type PregnancyMethod } from '@/lib/pregnancy';

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const METHODS: { id: PregnancyMethod; label: string; hint: string }[] = [
  { id: 'due_date', label: 'Due date', hint: 'I know my estimated due date' },
  { id: 'lmp', label: 'Last period', hint: 'First day of my last period' },
  { id: 'conception', label: 'Conception', hint: 'I know the conception date' },
];

export function PregnancySetup() {
  const router = useRouter();
  const [method, setMethod] = useState<PregnancyMethod>('due_date');
  const [date, setDate] = useState('');
  const [babyName, setBabyName] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function start() {
    setErr(null);
    if (!date) {
      setErr('Please choose a date first.');
      return;
    }
    setSaving(true);
    const lmp = deriveLmp(method, date);
    const due = dueDateFromLmp(lmp);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setErr('You need to be signed in.');
      setSaving(false);
      return;
    }
    const { error } = await supabase.from('pregnancies').insert({
      user_id: user.id,
      lmp_date: lmp,
      due_date: due,
      method,
      baby_name: babyName.trim() || null,
      status: 'active',
    });
    setSaving(false);
    if (error) {
      setErr(
        error.code === '23505'
          ? 'You already have an active pregnancy. End it first to start a new one.'
          : error.message
      );
      return;
    }
    router.push('/pregnancy');
    router.refresh();
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="relative overflow-hidden grain rounded-[2rem] border border-mauve-200 bg-gradient-to-br from-mauve-50 via-rose-50 to-cream-50 p-6 text-center">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-mauve-100 grid place-items-center text-mauve-500">
          <Baby size={26} />
        </div>
        <p className="mt-4 font-serif text-2xl text-ink-900">Let&apos;s set up your pregnancy</p>
        <p className="text-sm text-ink-600 mt-1">
          Tell us one date and we&apos;ll work out your week and due date.
        </p>
      </div>

      <div>
        <p className="text-xs uppercase tracking-widest text-ink-500 mb-2">Calculate from</p>
        <div className="grid grid-cols-3 gap-2">
          {METHODS.map((m) => (
            <button
              key={m.id}
              onClick={() => setMethod(m.id)}
              className={[
                'rounded-2xl border p-3 text-center transition',
                method === m.id
                  ? 'border-mauve-400 bg-mauve-50 text-mauve-500'
                  : 'border-cream-200 bg-cream-50 text-ink-600 hover:bg-cream-100',
              ].join(' ')}
            >
              <span className="text-sm font-medium block">{m.label}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-ink-500 mt-2">{METHODS.find((m) => m.id === method)?.hint}</p>
      </div>

      <label className="block">
        <span className="text-xs uppercase tracking-widest text-ink-600">
          {method === 'due_date' ? 'Estimated due date' : method === 'lmp' ? 'First day of last period' : 'Conception date'}
        </span>
        <input
          type="date"
          value={date}
          max={method === 'due_date' ? undefined : todayISO()}
          onChange={(e) => setDate(e.target.value)}
          className="mt-1 w-full rounded-xl border border-cream-200 bg-cream-50 px-4 py-3 outline-none focus:border-mauve-400"
        />
      </label>

      <label className="block">
        <span className="text-xs uppercase tracking-widest text-ink-600">Baby&apos;s name or nickname (optional)</span>
        <input
          type="text"
          value={babyName}
          onChange={(e) => setBabyName(e.target.value)}
          placeholder="e.g. Little one, Peanut…"
          className="mt-1 w-full rounded-xl border border-cream-200 bg-cream-50 px-4 py-3 outline-none focus:border-mauve-400"
        />
      </label>

      {err && (
        <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-3">{err}</p>
      )}

      <button
        onClick={start}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-mauve-400 to-rose-500 text-cream-50 py-4 font-medium disabled:opacity-60"
      >
        <Heart size={17} /> {saving ? 'Setting up…' : 'Start tracking my pregnancy'}
      </button>

      <p className="text-xs text-ink-500 leading-relaxed text-center">
        Luna&apos;s estimates are general guidance, not medical advice. Your provider&apos;s dating from
        scans is always the most accurate.
      </p>
    </div>
  );
}
