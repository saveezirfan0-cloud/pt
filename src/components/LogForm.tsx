'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  FLOW_COLORS,
  MOOD_OPTIONS,
  SYMPTOM_OPTIONS,
  type DailyLog,
  type PeriodLog,
} from '@/lib/cycle';

type Flow = PeriodLog['flow'];

export function LogForm({
  initialDate,
  initialPeriod,
  initialDaily,
}: {
  initialDate: string;
  initialPeriod: PeriodLog | null;
  initialDaily: DailyLog | null;
}) {
  const router = useRouter();
  const [date, setDate] = useState(initialDate);
  const [flow, setFlow] = useState<Flow | null>(initialPeriod?.flow ?? null);
  const [isStart, setIsStart] = useState<boolean>(initialPeriod?.is_period_start ?? false);
  const [mood, setMood] = useState<string[]>(initialDaily?.mood ?? []);
  const [symptoms, setSymptoms] = useState<string[]>(initialDaily?.symptoms ?? []);
  const [energy, setEnergy] = useState<number | null>(initialDaily?.energy_level ?? null);
  const [sleep, setSleep] = useState<string>(
    initialDaily?.sleep_hours != null ? String(initialDaily.sleep_hours) : ''
  );
  const [notes, setNotes] = useState<string>(initialDaily?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function toggle(list: string[], setList: (v: string[]) => void, val: string) {
    setList(list.includes(val) ? list.filter((x) => x !== val) : [...list, val]);
  }

  async function save() {
    setSaving(true);
    setErr(null);
    setMsg(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setErr('Not signed in');
      setSaving(false);
      return;
    }

    try {
      // Period
      if (flow) {
        const { error: e1 } = await supabase
          .from('period_logs')
          .upsert(
            {
              user_id: user.id,
              date,
              flow,
              is_period_start: isStart,
            },
            { onConflict: 'user_id,date' }
          );
        if (e1) throw e1;
      } else if (initialPeriod) {
        const { error: e1 } = await supabase
          .from('period_logs')
          .delete()
          .eq('user_id', user.id)
          .eq('date', date);
        if (e1) throw e1;
      }

      // Daily (if anything was provided)
      const hasDaily =
        mood.length > 0 || symptoms.length > 0 || energy != null || sleep || notes;
      if (hasDaily) {
        const { error: e2 } = await supabase
          .from('daily_logs')
          .upsert(
            {
              user_id: user.id,
              date,
              mood,
              symptoms,
              energy_level: energy,
              sleep_hours: sleep ? Number(sleep) : null,
              notes: notes || null,
            },
            { onConflict: 'user_id,date' }
          );
        if (e2) throw e2;
      } else if (initialDaily) {
        const { error: e2 } = await supabase
          .from('daily_logs')
          .delete()
          .eq('user_id', user.id)
          .eq('date', date);
        if (e2) throw e2;
      }

      // Update last_period_start on profile if we just marked a start
      if (flow && isStart) {
        await supabase
          .from('profiles')
          .update({ last_period_start: date })
          .eq('id', user.id);
      }

      setMsg('Saved.');
      router.refresh();
      setTimeout(() => router.push('/dashboard'), 500);
    } catch (e: any) {
      setErr(e.message || 'Could not save.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <Section title="Date">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-xl border border-cream-200 bg-cream-50 px-4 py-2.5 outline-none focus:border-rose-400"
        />
      </Section>

      <Section title="Flow" subtitle="Tap to toggle. Leave blank if not bleeding.">
        <div className="grid grid-cols-4 gap-2">
          {(['spotting', 'light', 'medium', 'heavy'] as Flow[]).map((f) => (
            <button
              key={f}
              onClick={() => setFlow(flow === f ? null : f)}
              className={[
                'rounded-2xl py-3 text-xs uppercase tracking-widest border transition',
                flow === f
                  ? 'border-transparent text-cream-50'
                  : 'border-cream-200 bg-cream-50 text-ink-700',
              ].join(' ')}
              style={flow === f ? { background: FLOW_COLORS[f] } : undefined}
            >
              {f}
            </button>
          ))}
        </div>
        {flow && (
          <label className="mt-3 flex items-center gap-2 text-sm text-ink-700">
            <input
              type="checkbox"
              checked={isStart}
              onChange={(e) => setIsStart(e.target.checked)}
              className="h-4 w-4 accent-rose-500"
            />
            This is the first day of my period
          </label>
        )}
      </Section>

      <Section title="Mood">
        <Chips options={MOOD_OPTIONS} selected={mood} onToggle={(v) => toggle(mood, setMood, v)} />
      </Section>

      <Section title="Symptoms">
        <Chips
          options={SYMPTOM_OPTIONS}
          selected={symptoms}
          onToggle={(v) => toggle(symptoms, setSymptoms, v)}
        />
      </Section>

      <Section title="Energy" subtitle="1 — drained · 5 — energized">
        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setEnergy(energy === n ? null : n)}
              className={[
                'rounded-2xl py-3 border text-lg font-serif transition',
                energy === n
                  ? 'border-transparent bg-rose-500 text-cream-50'
                  : 'border-cream-200 bg-cream-50 text-ink-700',
              ].join(' ')}
            >
              {n}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Sleep">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={24}
            step={0.5}
            value={sleep}
            onChange={(e) => setSleep(e.target.value)}
            placeholder="0"
            className="w-28 rounded-xl border border-cream-200 bg-cream-50 px-4 py-2.5 outline-none focus:border-rose-400"
          />
          <span className="text-ink-600 text-sm">hours</span>
        </div>
      </Section>

      <Section title="Notes">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Anything else worth remembering…"
          className="w-full rounded-2xl border border-cream-200 bg-cream-50 px-4 py-3 outline-none focus:border-rose-400 resize-none"
        />
      </Section>

      {err && (
        <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-3 flex items-center gap-2">
          <X size={16} /> {err}
        </p>
      )}
      {msg && (
        <p className="text-sm text-sage-500 bg-sage-50 border border-sage-200 rounded-lg p-3 flex items-center gap-2">
          <Check size={16} /> {msg}
        </p>
      )}

      <button
        onClick={save}
        disabled={saving}
        className="w-full rounded-2xl bg-rose-500 text-cream-50 py-4 font-medium disabled:opacity-60 hover:bg-rose-600 transition"
      >
        {saving ? 'Saving…' : 'Save entry'}
      </button>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="font-serif text-xl">{title}</h2>
      {subtitle && <p className="text-xs text-ink-500 mt-0.5">{subtitle}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Chips({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const on = selected.includes(opt);
        return (
          <button
            key={opt}
            onClick={() => onToggle(opt)}
            className={[
              'rounded-full px-4 py-2 text-sm border transition',
              on
                ? 'bg-ink-900 text-cream-50 border-transparent'
                : 'bg-cream-50 text-ink-700 border-cream-200',
            ].join(' ')}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
