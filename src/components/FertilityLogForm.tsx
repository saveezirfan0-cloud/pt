'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  CERVIX_LABEL,
  C_TO_F,
  F_TO_C,
  LH_LABEL,
  MUCUS_LABEL,
  type Cervix,
  type FertilityLog,
  type LH,
  type Mucus,
} from '@/lib/fertility';

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function FertilityLogForm({
  initial,
  tempUnit,
}: {
  initial: FertilityLog | null;
  tempUnit: 'c' | 'f';
}) {
  const router = useRouter();
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [temp, setTemp] = useState(
    initial?.bbt_c != null
      ? String(Math.round((tempUnit === 'f' ? C_TO_F(initial.bbt_c) : initial.bbt_c) * 100) / 100)
      : ''
  );
  const [mucus, setMucus] = useState<Mucus | null>(initial?.mucus ?? null);
  const [lh, setLh] = useState<LH | null>(initial?.lh ?? null);
  const [cervix, setCervix] = useState<Cervix | null>(initial?.cervix ?? null);
  const [intercourse, setIntercourse] = useState(initial?.intercourse ?? false);
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

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

    let bbt_c: number | null = null;
    if (temp) {
      const v = parseFloat(temp);
      if (!Number.isNaN(v)) bbt_c = tempUnit === 'f' ? Math.round(F_TO_C(v) * 100) / 100 : v;
    }

    const hasData = bbt_c != null || mucus || lh || cervix || intercourse || notes;
    try {
      if (hasData) {
        const { error } = await supabase.from('fertility_logs').upsert(
          {
            user_id: user.id,
            date,
            bbt_c,
            mucus,
            lh,
            cervix,
            intercourse,
            notes: notes || null,
          },
          { onConflict: 'user_id,date' }
        );
        if (error) throw error;
      } else if (initial) {
        await supabase.from('fertility_logs').delete().eq('user_id', user.id).eq('date', date);
      }
      setMsg('Saved.');
      router.refresh();
      setTimeout(() => router.push('/fertility'), 500);
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
          max={todayISO()}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-xl border border-cream-200 bg-cream-50 px-4 py-2.5 outline-none focus:border-rose-400"
        />
      </Section>

      <Section title="Basal body temperature" subtitle="Taken first thing, before getting up.">
        <div className="flex items-center gap-2">
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            value={temp}
            onChange={(e) => setTemp(e.target.value)}
            placeholder={tempUnit === 'f' ? '97.80' : '36.50'}
            className="w-32 rounded-xl border border-cream-200 bg-cream-50 px-4 py-2.5 outline-none focus:border-rose-400"
          />
          <span className="text-ink-600 text-sm">°{tempUnit.toUpperCase()}</span>
        </div>
      </Section>

      <Section title="Cervical mucus" subtitle="Egg-white = most fertile.">
        <Chips
          options={(Object.keys(MUCUS_LABEL) as Mucus[]).map((m) => ({ value: m, label: MUCUS_LABEL[m] }))}
          selected={mucus}
          onToggle={(v) => setMucus(mucus === v ? null : (v as Mucus))}
        />
      </Section>

      <Section title="Ovulation (LH) test">
        <Chips
          options={(['negative', 'low', 'high', 'peak', 'positive'] as LH[]).map((l) => ({
            value: l,
            label: LH_LABEL[l],
          }))}
          selected={lh}
          onToggle={(v) => setLh(lh === v ? null : (v as LH))}
        />
      </Section>

      <Section title="Cervix" subtitle="Optional — position, firmness, openness.">
        <Chips
          options={(Object.keys(CERVIX_LABEL) as Cervix[]).map((c) => ({ value: c, label: CERVIX_LABEL[c] }))}
          selected={cervix}
          onToggle={(v) => setCervix(cervix === v ? null : (v as Cervix))}
        />
      </Section>

      <Section title="Intimacy">
        <button
          onClick={() => setIntercourse((v) => !v)}
          className={[
            'rounded-2xl px-5 py-3 text-sm border transition',
            intercourse
              ? 'border-transparent bg-rose-500 text-cream-50'
              : 'border-cream-200 bg-cream-50 text-ink-700',
          ].join(' ')}
        >
          {intercourse ? 'Logged' : 'Log intercourse'}
        </button>
      </Section>

      <Section title="Notes">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Disturbed sleep, illness, alcohol — anything that affects temperature…"
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
        {saving ? 'Saving…' : 'Save'}
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
  options: { value: string; label: string }[];
  selected: string | null;
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const on = selected === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onToggle(opt.value)}
            className={[
              'rounded-full px-4 py-2 text-sm border transition',
              on ? 'bg-ink-900 text-cream-50 border-transparent' : 'bg-cream-50 text-ink-700 border-cream-200',
            ].join(' ')}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
