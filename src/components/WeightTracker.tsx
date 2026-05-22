'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, TrendingUp } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type WeightEntry = { id: string; date: string; weight_kg: number };
type Unit = 'kg' | 'lb';

const KG_PER_LB = 0.45359237;

function toDisplay(kg: number, unit: Unit): number {
  return unit === 'kg' ? kg : kg / KG_PER_LB;
}
function toKg(value: number, unit: Unit): number {
  return unit === 'kg' ? value : value * KG_PER_LB;
}
function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function WeightTracker({
  pregnancyId,
  initial,
}: {
  pregnancyId: string;
  initial: WeightEntry[];
}) {
  const router = useRouter();
  const [unit, setUnit] = useState<Unit>('kg');
  const [entries, setEntries] = useState<WeightEntry[]>(initial);
  const [adding, setAdding] = useState(false);
  const [value, setValue] = useState('');
  const [date, setDate] = useState(todayISO());
  const [saving, setSaving] = useState(false);

  const sorted = useMemo(
    () => [...entries].sort((a, b) => a.date.localeCompare(b.date)),
    [entries]
  );
  const first = sorted[0];
  const latest = sorted[sorted.length - 1];
  const gainKg = first && latest ? latest.weight_kg - first.weight_kg : 0;

  async function save() {
    const v = parseFloat(value);
    if (!v || v <= 0) return;
    setSaving(true);
    const kg = Math.round(toKg(v, unit) * 100) / 100;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }
    const { data, error } = await supabase
      .from('pregnancy_weights')
      .upsert(
        { user_id: user.id, pregnancy_id: pregnancyId, date, weight_kg: kg },
        { onConflict: 'pregnancy_id,date' }
      )
      .select()
      .single();
    setSaving(false);
    if (!error && data) {
      setEntries((e) => {
        const without = e.filter((x) => x.date !== date);
        return [...without, data as WeightEntry];
      });
      setValue('');
      setAdding(false);
      router.refresh();
    }
  }

  // sparkline points
  const spark = useMemo(() => {
    if (sorted.length < 2) return null;
    const vals = sorted.map((e) => e.weight_kg);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range = max - min || 1;
    const w = 280;
    const h = 60;
    const step = w / (sorted.length - 1);
    return sorted
      .map((e, i) => {
        const x = i * step;
        const y = h - ((e.weight_kg - min) / range) * (h - 8) - 4;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }, [sorted]);

  return (
    <section className="rounded-[1.75rem] border border-cream-200 bg-cream-50/70 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-2xl bg-sage-100 grid place-items-center text-sage-500">
            <TrendingUp size={17} />
          </div>
          <h2 className="font-serif text-xl">Weight</h2>
        </div>
        <div className="flex rounded-full border border-cream-200 bg-cream-50 p-0.5 text-xs">
          {(['kg', 'lb'] as Unit[]).map((u) => (
            <button
              key={u}
              onClick={() => setUnit(u)}
              className={[
                'px-3 py-1 rounded-full transition',
                unit === u ? 'bg-rose-500 text-cream-50' : 'text-ink-600',
              ].join(' ')}
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      {latest ? (
        <div className="mt-4 flex items-end justify-between">
          <div>
            <p className="font-serif text-4xl text-ink-900 leading-none">
              {toDisplay(latest.weight_kg, unit).toFixed(1)}
              <span className="text-lg text-ink-500 ml-1">{unit}</span>
            </p>
            <p className="text-xs text-ink-500 mt-1">latest</p>
          </div>
          {sorted.length >= 2 && (
            <div className="text-right">
              <p
                className={[
                  'text-2xl font-serif leading-none',
                  gainKg >= 0 ? 'text-sage-500' : 'text-rose-500',
                ].join(' ')}
              >
                {gainKg >= 0 ? '+' : ''}
                {toDisplay(gainKg, unit).toFixed(1)} {unit}
              </p>
              <p className="text-xs text-ink-500 mt-1">since start</p>
            </div>
          )}
        </div>
      ) : (
        <p className="mt-4 text-sm text-ink-600">Log your weight to start tracking gain over time.</p>
      )}

      {spark && (
        <svg viewBox="0 0 280 60" className="mt-4 w-full" preserveAspectRatio="none">
          <polyline
            points={spark}
            fill="none"
            stroke="rgb(var(--sage-400))"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}

      {adding ? (
        <div className="mt-4 space-y-3">
          <div className="flex gap-2">
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={`Weight (${unit})`}
              className="flex-1 rounded-xl border border-cream-200 bg-cream-50 px-4 py-3 outline-none focus:border-rose-400"
            />
            <input
              type="date"
              value={date}
              max={todayISO()}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-xl border border-cream-200 bg-cream-50 px-3 py-3 text-sm outline-none focus:border-rose-400"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setAdding(false)}
              className="rounded-2xl border border-cream-200 px-5 py-3 text-sm text-ink-600 hover:bg-cream-100"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving || !value}
              className="flex-1 rounded-2xl bg-rose-500 text-cream-50 py-3 text-sm font-medium hover:bg-rose-600 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-cream-200 bg-cream-50 py-3 text-sm text-ink-700 hover:bg-cream-100"
        >
          <Plus size={15} /> Log weight
        </button>
      )}
    </section>
  );
}
