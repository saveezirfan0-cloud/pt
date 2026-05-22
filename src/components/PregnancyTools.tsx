'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Activity, Footprints, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export function PregnancyTools() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Link
        href="/pregnancy/kicks"
        className="rounded-2xl border border-cream-200 bg-cream-50/70 p-4 hover:bg-cream-100 transition flex items-center gap-3"
      >
        <div className="h-10 w-10 rounded-2xl bg-mauve-100 grid place-items-center text-mauve-500">
          <Footprints size={18} />
        </div>
        <div>
          <p className="font-medium text-ink-900 text-sm">Kick counter</p>
          <p className="text-xs text-ink-500">Count movements</p>
        </div>
      </Link>
      <Link
        href="/pregnancy/contractions"
        className="rounded-2xl border border-cream-200 bg-cream-50/70 p-4 hover:bg-cream-100 transition flex items-center gap-3"
      >
        <div className="h-10 w-10 rounded-2xl bg-rose-100 grid place-items-center text-rose-600">
          <Activity size={18} />
        </div>
        <div>
          <p className="font-medium text-ink-900 text-sm">Contractions</p>
          <p className="text-xs text-ink-500">Time &amp; track</p>
        </div>
      </Link>
    </div>
  );
}

export function EndPregnancy({ pregnancyId }: { pregnancyId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('birth');
  const [saving, setSaving] = useState(false);

  async function end() {
    setSaving(true);
    const supabase = createClient();
    const today = new Date();
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    await supabase
      .from('pregnancies')
      .update({ status: 'ended', end_date: iso, end_reason: reason })
      .eq('id', pregnancyId);
    setSaving(false);
    setOpen(false);
    router.push('/dashboard');
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-2xl border border-cream-200 bg-cream-50/70 py-3 text-sm text-ink-500 hover:bg-cream-100"
      >
        End pregnancy tracking
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-cream-200 bg-cream-50/70 p-5 space-y-4">
      <div className="flex items-start justify-between">
        <p className="font-serif text-lg">End pregnancy tracking?</p>
        <button onClick={() => setOpen(false)} aria-label="Close" className="text-ink-400">
          <X size={18} />
        </button>
      </div>
      <p className="text-sm text-ink-600">
        This moves it to your history and returns you to cycle tracking. Your logs are kept.
      </p>
      <select
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="w-full rounded-xl border border-cream-200 bg-cream-50 px-4 py-3 text-sm outline-none focus:border-rose-400"
      >
        <option value="birth">Baby has arrived 🎉</option>
        <option value="loss">Pregnancy loss</option>
        <option value="other">Other</option>
      </select>
      <div className="flex gap-2">
        <button
          onClick={() => setOpen(false)}
          className="rounded-2xl border border-cream-200 px-5 py-3 text-sm text-ink-600 hover:bg-cream-100"
        >
          Keep tracking
        </button>
        <button
          onClick={end}
          disabled={saving}
          className="flex-1 rounded-2xl bg-ink-900 text-cream-50 py-3 text-sm font-medium hover:bg-ink-800 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'End tracking'}
        </button>
      </div>
    </div>
  );
}
