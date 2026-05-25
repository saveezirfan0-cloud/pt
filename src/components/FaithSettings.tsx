'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Moon } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  MADHHAB_DEFAULTS,
  MADHHAB_LABELS,
  type IslamicSettings,
  type Madhhab,
} from '@/lib/islamic';

const DEFAULTS: IslamicSettings = {
  enabled: false,
  madhhab: 'hanafi',
  min_hayd: 3,
  max_hayd: 10,
  min_tuhr: 15,
  max_nifas: 40,
  ghusl_reminders: true,
};

export function FaithSettings({ initial }: { initial: IslamicSettings | null }) {
  const router = useRouter();
  const [s, setS] = useState<IslamicSettings>(initial ?? DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function applyMadhhab(m: Madhhab) {
    if (m === 'custom') {
      setS((p) => ({ ...p, madhhab: m }));
      return;
    }
    const d = MADHHAB_DEFAULTS[m];
    setS((p) => ({
      ...p,
      madhhab: m,
      min_hayd: d.min_hayd,
      max_hayd: d.max_hayd,
      min_tuhr: d.min_tuhr,
      max_nifas: d.max_nifas,
    }));
  }

  async function save(next?: Partial<IslamicSettings>) {
    const merged = { ...s, ...next };
    setS(merged);
    setSaving(true);
    setSaved(false);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('islamic_settings')
        .upsert({ user_id: user.id, ...merged }, { onConflict: 'user_id' });
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
    router.refresh();
  }

  const num = (key: keyof IslamicSettings, label: string, min: number, max: number) => (
    <label className="flex items-center justify-between">
      <span className="text-sm text-ink-800">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={s[key] as number}
        disabled={s.madhhab !== 'custom'}
        onChange={(e) => setS((p) => ({ ...p, [key]: Number(e.target.value) }))}
        onBlur={() => save()}
        className="w-20 rounded-xl border border-cream-200 bg-cream-50 px-3 py-2 text-sm outline-none focus:border-mauve-400 disabled:opacity-60"
      />
    </label>
  );

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="relative overflow-hidden grain rounded-[2rem] border border-mauve-200 bg-gradient-to-br from-mauve-50 via-rose-50 to-cream-50 p-6">
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-2xl bg-mauve-100 grid place-items-center text-mauve-500">
            <Moon size={20} />
          </div>
          <div className="flex-1">
            <p className="font-serif text-2xl text-ink-900">Faith &amp; purity</p>
            <p className="text-sm text-ink-600 mt-1">
              Organise tracking of menstruation, postnatal bleeding, and purity, with gentle prayer
              and ghusl reminders.
            </p>
          </div>
          <Toggle on={s.enabled} onChange={(v) => save({ enabled: v })} />
        </div>
      </div>

      {s.enabled && (
        <>
          <section className="rounded-[1.5rem] border border-cream-200 bg-cream-50/70 p-5">
            <h2 className="font-serif text-xl mb-1">Your school (madhhab)</h2>
            <p className="text-xs text-ink-500 mb-3">
              This sets the day-limits used to flag possibilities. You can fine-tune them below.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(MADHHAB_LABELS) as Madhhab[]).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    applyMadhhab(m);
                    setTimeout(() => save({ madhhab: m }), 0);
                  }}
                  className={[
                    'rounded-2xl border py-2.5 text-sm transition',
                    s.madhhab === m
                      ? 'border-mauve-400 bg-mauve-50 text-mauve-500'
                      : 'border-cream-200 bg-cream-50 text-ink-600 hover:bg-cream-100',
                  ].join(' ')}
                >
                  {MADHHAB_LABELS[m]}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-[1.5rem] border border-cream-200 bg-cream-50/70 p-5 space-y-3">
            <h2 className="font-serif text-xl">Day limits</h2>
            <p className="text-xs text-ink-500">
              {s.madhhab === 'custom'
                ? 'Set your own limits.'
                : `Defaults for ${MADHHAB_LABELS[s.madhhab]} — switch to “Custom” to edit.`}
            </p>
            {num('min_hayd', 'Minimum menstruation (days)', 1, 15)}
            {num('max_hayd', 'Maximum menstruation (days)', 1, 15)}
            {num('min_tuhr', 'Minimum purity between periods (days)', 1, 40)}
            {num('max_nifas', 'Maximum postnatal / nifas (days)', 1, 80)}
          </section>

          <section className="rounded-[1.5rem] border border-cream-200 bg-cream-50/70 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-ink-900">Ghusl reminders</p>
                <p className="text-xs text-ink-500 mt-0.5">A gentle prompt when bleeding ends.</p>
              </div>
              <Toggle on={s.ghusl_reminders} onChange={(v) => save({ ghusl_reminders: v })} />
            </div>
          </section>

          <p className="text-xs text-ink-500 leading-relaxed">
            Luna helps you organise and remember — it does not issue religious rulings. Schools of
            fiqh differ on the details of menstruation, nifas, istihada, and purity. For anything
            you&apos;re unsure about, please consult a qualified scholar you trust.
          </p>
        </>
      )}

      {saving && <p className="text-xs text-ink-500">Saving…</p>}
      {saved && <p className="text-xs text-sage-500">Saved.</p>}
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      aria-pressed={on}
      className={[
        'shrink-0 inline-flex h-6 w-11 items-center rounded-full transition-colors',
        on ? 'bg-mauve-500' : 'bg-cream-200',
      ].join(' ')}
    >
      <span
        className={[
          'inline-block h-5 w-5 transform rounded-full bg-cream-50 shadow transition',
          on ? 'translate-x-5' : 'translate-x-0.5',
        ].join(' ')}
      />
    </button>
  );
}
