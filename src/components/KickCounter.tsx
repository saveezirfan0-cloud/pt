'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Footprints, RotateCcw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Session = { id: string; started_at: string; ended_at: string | null; kick_count: number };

function fmtDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function KickCounter({
  pregnancyId,
  initialSessions,
}: {
  pregnancyId: string | null;
  initialSessions: Session[];
}) {
  const router = useRouter();
  const [count, setCount] = useState(0);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [saving, setSaving] = useState(false);
  const [sessions, setSessions] = useState<Session[]>(initialSessions);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (startedAt) {
      tick.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startedAt.getTime()) / 1000));
      }, 1000);
    }
    return () => {
      if (tick.current) clearInterval(tick.current);
    };
  }, [startedAt]);

  function addKick() {
    if (!startedAt) setStartedAt(new Date());
    setCount((c) => c + 1);
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate?.(15);
  }

  function reset() {
    setCount(0);
    setStartedAt(null);
    setElapsed(0);
  }

  async function save() {
    if (!startedAt || count === 0) return;
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }
    const row = {
      user_id: user.id,
      pregnancy_id: pregnancyId,
      started_at: startedAt.toISOString(),
      ended_at: new Date().toISOString(),
      kick_count: count,
    };
    const { data, error } = await supabase.from('kick_sessions').insert(row).select().single();
    setSaving(false);
    if (!error && data) {
      setSessions((s) => [data as Session, ...s].slice(0, 20));
      reset();
      router.refresh();
    }
  }

  // 10 kicks is the classic "count to ten" milestone.
  const reachedGoal = count >= 10;

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden grain rounded-[2rem] border border-mauve-200 bg-gradient-to-br from-mauve-50 via-rose-50 to-cream-50 p-6 text-center">
        <p className="text-[11px] uppercase tracking-[0.3em] text-mauve-500">Kicks counted</p>
        <button
          onClick={addKick}
          className="mx-auto mt-4 flex h-44 w-44 flex-col items-center justify-center rounded-full bg-gradient-to-br from-mauve-400 to-rose-500 text-cream-50 shadow-[0_18px_40px_-16px_rgb(var(--rose-500)/0.6)] active:scale-95 transition-transform"
        >
          <Footprints size={26} className="opacity-90" />
          <span className="font-serif text-6xl leading-none mt-1">{count}</span>
          <span className="text-xs text-cream-50/80 mt-1">tap for each kick</span>
        </button>
        <p className="mt-4 text-sm text-ink-600">
          {startedAt ? `${fmtDuration(elapsed)} elapsed` : 'Tap to start counting'}
        </p>
        {reachedGoal && (
          <p className="mt-2 text-sm font-medium text-sage-500">
            You reached 10 — nicely done. You can save this session.
          </p>
        )}

        <div className="mt-5 flex gap-2">
          <button
            onClick={reset}
            disabled={count === 0}
            className="flex items-center justify-center gap-2 rounded-2xl border border-cream-200 bg-cream-50 px-4 py-3 text-sm text-ink-600 hover:bg-cream-100 disabled:opacity-40"
          >
            <RotateCcw size={15} /> Reset
          </button>
          <button
            onClick={save}
            disabled={count === 0 || saving}
            className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-ink-900 text-cream-50 px-4 py-3 text-sm font-medium hover:bg-ink-800 disabled:opacity-50"
          >
            <Check size={15} /> {saving ? 'Saving…' : 'Save session'}
          </button>
        </div>
      </div>

      <p className="text-xs text-ink-500 leading-relaxed px-1">
        Counting kicks is a simple way to get to know your baby&apos;s usual pattern. Many people count
        how long it takes to feel 10 movements. If you ever notice a clear drop in movement, contact
        your midwife or doctor straight away — trust your instincts.
      </p>

      {sessions.length > 0 && (
        <section>
          <h2 className="font-serif text-xl mb-3">Recent sessions</h2>
          <div className="space-y-2">
            {sessions.map((s) => {
              const dur =
                s.ended_at && s.started_at
                  ? Math.max(
                      0,
                      Math.floor(
                        (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 1000
                      )
                    )
                  : 0;
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-2xl border border-cream-200 bg-cream-50/70 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-ink-900">{s.kick_count} kicks</p>
                    <p className="text-xs text-ink-500">{fmtTime(s.started_at)}</p>
                  </div>
                  <span className="text-sm text-ink-600">{fmtDuration(dur)}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
