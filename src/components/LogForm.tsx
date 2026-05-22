'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Plus, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  FLOW_COLORS,
  MOOD_OPTIONS,
  SYMPTOM_OPTIONS,
  type DailyLog,
  type PeriodLog,
} from '@/lib/cycle';

type Flow = PeriodLog['flow'];

const INTENSITY_LABELS = ['', 'barely', 'mild', 'moderate', 'strong', 'severe'];

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
  // symptom name -> intensity (1..5). Presence of a key means "selected".
  const [symptomMap, setSymptomMap] = useState<Record<string, number>>(() => {
    const base: Record<string, number> = {};
    const details = initialDaily?.symptom_details || {};
    for (const s of initialDaily?.symptoms ?? []) base[s] = details[s] ?? 3;
    return base;
  });
  const [customSymptoms, setCustomSymptoms] = useState<string[]>([]);
  const [newSymptom, setNewSymptom] = useState('');
  const [energy, setEnergy] = useState<number | null>(initialDaily?.energy_level ?? null);
  const [sleep, setSleep] = useState<string>(
    initialDaily?.sleep_hours != null ? String(initialDaily.sleep_hours) : ''
  );
  const [notes, setNotes] = useState<string>(initialDaily?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Load the user's custom symptom vocabulary.
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.from('custom_symptoms').select('name').order('name');
      if (data) setCustomSymptoms(data.map((r: { name: string }) => r.name));
    })();
  }, []);

  function toggleMood(val: string) {
    setMood((m) => (m.includes(val) ? m.filter((x) => x !== val) : [...m, val]));
  }

  function toggleSymptom(val: string) {
    setSymptomMap((prev) => {
      const next = { ...prev };
      if (val in next) delete next[val];
      else next[val] = 3;
      return next;
    });
  }

  function setIntensity(val: string, level: number) {
    setSymptomMap((prev) => ({ ...prev, [val]: level }));
  }

  async function addCustomSymptom() {
    const name = newSymptom.trim().toLowerCase();
    if (!name) return;
    setNewSymptom('');
    if (!customSymptoms.includes(name) && !SYMPTOM_OPTIONS.includes(name)) {
      setCustomSymptoms((c) => [...c, name].sort());
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('custom_symptoms')
          .upsert({ user_id: user.id, name }, { onConflict: 'user_id,name' });
      }
    }
    setSymptomMap((prev) => ({ ...prev, [name]: 3 }));
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

    const symptoms = Object.keys(symptomMap);

    try {
      if (flow) {
        const { error: e1 } = await supabase
          .from('period_logs')
          .upsert(
            { user_id: user.id, date, flow, is_period_start: isStart },
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

      const hasDaily =
        mood.length > 0 || symptoms.length > 0 || energy != null || sleep || notes;
      if (hasDaily) {
        const { error: e2 } = await supabase.from('daily_logs').upsert(
          {
            user_id: user.id,
            date,
            mood,
            symptoms,
            symptom_details: symptomMap,
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

      if (flow && isStart) {
        await supabase.from('profiles').update({ last_period_start: date }).eq('id', user.id);
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

  const allSymptoms = [...SYMPTOM_OPTIONS, ...customSymptoms.filter((c) => !SYMPTOM_OPTIONS.includes(c))];

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
                flow === f ? 'border-transparent text-cream-50' : 'border-cream-200 bg-cream-50 text-ink-700',
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
        <div className="flex flex-wrap gap-2">
          {MOOD_OPTIONS.map((opt) => {
            const on = mood.includes(opt);
            return (
              <button
                key={opt}
                onClick={() => toggleMood(opt)}
                className={[
                  'rounded-full px-4 py-2 text-sm border transition',
                  on ? 'bg-ink-900 text-cream-50 border-transparent' : 'bg-cream-50 text-ink-700 border-cream-200',
                ].join(' ')}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Symptoms" subtitle="Tap to add, then set how strong it felt.">
        <div className="flex flex-wrap gap-2">
          {allSymptoms.map((opt) => {
            const on = opt in symptomMap;
            return (
              <button
                key={opt}
                onClick={() => toggleSymptom(opt)}
                className={[
                  'rounded-full px-4 py-2 text-sm border transition capitalize',
                  on ? 'bg-ink-900 text-cream-50 border-transparent' : 'bg-cream-50 text-ink-700 border-cream-200',
                ].join(' ')}
              >
                {opt}
              </button>
            );
          })}
        </div>

        {/* Add custom symptom */}
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={newSymptom}
            onChange={(e) => setNewSymptom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCustomSymptom();
              }
            }}
            placeholder="Add your own symptom…"
            maxLength={40}
            className="flex-1 rounded-xl border border-cream-200 bg-cream-50 px-4 py-2.5 text-sm outline-none focus:border-rose-400"
          />
          <button
            onClick={addCustomSymptom}
            disabled={!newSymptom.trim()}
            className="rounded-xl border border-cream-200 bg-cream-50 px-4 grid place-items-center text-ink-700 hover:bg-cream-100 disabled:opacity-40"
            aria-label="Add symptom"
          >
            <Plus size={18} />
          </button>
        </div>

        {/* Intensity sliders for selected symptoms */}
        {Object.keys(symptomMap).length > 0 && (
          <div className="mt-4 space-y-3">
            {Object.keys(symptomMap).map((s) => (
              <div key={s} className="rounded-2xl border border-cream-200 bg-cream-50/70 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-ink-900 capitalize">{s}</span>
                  <span className="text-xs text-ink-500">{INTENSITY_LABELS[symptomMap[s]]}</span>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setIntensity(s, n)}
                      className={[
                        'h-8 rounded-lg border text-xs transition',
                        symptomMap[s] >= n
                          ? 'border-transparent bg-rose-500 text-cream-50'
                          : 'border-cream-200 bg-cream-50 text-ink-500',
                      ].join(' ')}
                      aria-label={`Intensity ${n}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Energy" subtitle="1 — drained · 5 — energized">
        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setEnergy(energy === n ? null : n)}
              className={[
                'rounded-2xl py-3 border text-lg font-serif transition',
                energy === n ? 'border-transparent bg-rose-500 text-cream-50' : 'border-cream-200 bg-cream-50 text-ink-700',
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
