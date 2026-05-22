'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Square, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Contraction = { id: string; started_at: string; ended_at: string; duration_seconds: number };

function fmtClock(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function ContractionTimer({
  pregnancyId,
  initial,
}: {
  pregnancyId: string | null;
  initial: Contraction[];
}) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [list, setList] = useState<Contraction[]>(initial);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running && startedAt) {
      tick.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startedAt.getTime()) / 1000));
      }, 250);
    }
    return () => {
      if (tick.current) clearInterval(tick.current);
    };
  }, [running, startedAt]);

  function start() {
    setStartedAt(new Date());
    setElapsed(0);
    setRunning(true);
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate?.(20);
  }

  async function stop() {
    if (!startedAt) return;
    const ended = new Date();
    const duration = Math.max(0, Math.floor((ended.getTime() - startedAt.getTime()) / 1000));
    setRunning(false);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const row = {
      user_id: user.id,
      pregnancy_id: pregnancyId,
      started_at: startedAt.toISOString(),
      ended_at: ended.toISOString(),
      duration_seconds: duration,
    };
    const { data } = await supabase.from('contractions').insert(row).select().single();
    if (data) setList((l) => [data as Contraction, ...l].slice(0, 30));
    setStartedAt(null);
    setElapsed(0);
    router.refresh();
  }

  async function remove(id: string) {
    setList((l) => l.filter((c) => c.id !== id));
    const supabase = createClient();
    await supabase.from('contractions').delete().eq('id', id);
    router.refresh();
  }

  // Frequency = time from the start of one contraction to the start of the next.
  const withGaps = list.map((c, i) => {
    const next = list[i + 1]; // list is newest-first, so next is the previous-in-time one
    const gap = next
      ? Math.round((new Date(c.started_at).getTime() - new Date(next.started_at).getTime()) / 1000)
      : null;
    return { ...c, gap };
  });

  // Rough 5-1-1 read on the most recent few.
  const recent = list.slice(0, 5);
  const avgDur = recent.length
    ? Math.round(recent.reduce((s, c) => s + c.duration_seconds, 0) / recent.length)
    : 0;

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden grain rounded-[2rem] border border-mauve-200 bg-gradient-to-br from-mauve-50 via-rose-50 to-cream-50 p-6 text-center">
        <p className="text-[11px] uppercase tracking-[0.3em] text-mauve-500">
          {running ? 'Contraction in progress' : 'Timer ready'}
        </p>
        <p className="font-serif text-7xl leading-none mt-3 text-ink-900 tabular-nums">
          {fmtClock(elapsed)}
        </p>
        <button
          onClick={running ? stop : start}
          className={[
            'mx-auto mt-5 flex h-16 w-16 items-center justify-center rounded-full text-cream-50 shadow-lg active:scale-95 transition-transform',
            running ? 'bg-ink-900' : 'bg-gradient-to-br from-mauve-400 to-rose-500',
          ].join(' ')}
          aria-label={running ? 'Stop contraction' : 'Start contraction'}
        >
          {running ? <Square size={24} /> : <Play size={26} className="ml-1" />}
        </button>
        <p className="mt-4 text-sm text-ink-600">
          {running ? 'Tap to stop when it ends' : 'Tap when a contraction begins'}
        </p>
        {avgDur > 0 && !running && (
          <p className="mt-1 text-xs text-ink-500">
            Last {recent.length} averaged {fmtClock(avgDur)} long
          </p>
        )}
      </div>

      <p className="text-xs text-ink-500 leading-relaxed px-1">
        A common guideline for full-term labour is &ldquo;5-1-1&rdquo;: contractions about 5 minutes
        apart, each lasting 1 minute, for at least 1 hour. Follow the specific advice your provider
        gave you, and call them if you&apos;re unsure or your waters break.
      </p>

      {withGaps.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif text-xl">History</h2>
            <span className="text-xs text-ink-500">duration · gap since previous</span>
          </div>
          <div className="space-y-2">
            {withGaps.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-2xl border border-cream-200 bg-cream-50/70 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-ink-900">{fmtClock(c.duration_seconds)}</p>
                  <p className="text-xs text-ink-500">{fmtTime(c.started_at)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-ink-600">
                    {c.gap != null ? `every ${fmtClock(c.gap)}` : '—'}
                  </span>
                  <button
                    onClick={() => remove(c.id)}
                    aria-label="Delete"
                    className="text-ink-400 hover:text-rose-500"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
