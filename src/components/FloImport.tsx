'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Check, FileJson, Loader2, Upload, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { parseFloExport, type ImportPreview } from '@/lib/import';

type Phase = 'idle' | 'parsing' | 'preview' | 'importing' | 'done' | 'error';

type Result = { periodsInserted: number; periodsSkipped: number; dailyInserted: number; dailySkipped: number };

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function FloImport() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [dragging, setDragging] = useState(false);

  function reset() {
    setPhase('idle');
    setFileName(null);
    setPreview(null);
    setErr(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  async function handleFile(file: File) {
    setErr(null);
    setResult(null);
    setFileName(file.name);
    setPhase('parsing');
    try {
      const text = await file.text();
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error("That file isn't valid JSON. Export your data from Flo as JSON and try again.");
      }
      const parsed = parseFloExport(json);
      setPreview(parsed);
      setPhase('preview');
    } catch (e: any) {
      setErr(e.message || 'Could not read that file.');
      setPhase('error');
    }
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  async function runImport() {
    if (!preview) return;
    setPhase('importing');
    setErr(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setErr('You need to be signed in to import.');
      setPhase('error');
      return;
    }

    try {
      const range = preview.dateRange;
      // Fetch existing dates in range so we never overwrite what's already logged.
      const existingPeriods = new Set<string>();
      const existingDaily = new Set<string>();
      if (range) {
        const [{ data: p }, { data: d }] = await Promise.all([
          supabase
            .from('period_logs')
            .select('date')
            .eq('user_id', user.id)
            .gte('date', range.from)
            .lte('date', range.to),
          supabase
            .from('daily_logs')
            .select('date')
            .eq('user_id', user.id)
            .gte('date', range.from)
            .lte('date', range.to),
        ]);
        (p || []).forEach((r: { date: string }) => existingPeriods.add(r.date));
        (d || []).forEach((r: { date: string }) => existingDaily.add(r.date));
      }

      const periodRows = preview.periodDays
        .filter((row) => !existingPeriods.has(row.date))
        .map((row) => ({
          user_id: user.id,
          date: row.date,
          flow: row.flow,
          is_period_start: row.is_period_start,
        }));
      const periodsSkipped = preview.periodDays.length - periodRows.length;

      const dailyRows = preview.dailyDays
        .filter((row) => !existingDaily.has(row.date))
        .filter((row) => row.symptoms.length > 0 || row.mood.length > 0)
        .map((row) => ({
          user_id: user.id,
          date: row.date,
          symptoms: row.symptoms,
          mood: row.mood,
        }));
      const dailySkipped = preview.dailyDays.length - dailyRows.length;

      // Insert in chunks to stay well under request limits.
      for (const batch of chunk(periodRows, 400)) {
        const { error } = await supabase.from('period_logs').insert(batch);
        if (error) throw error;
      }
      for (const batch of chunk(dailyRows, 400)) {
        const { error } = await supabase.from('daily_logs').insert(batch);
        if (error) throw error;
      }

      // Point the dashboard at the most recent imported period start.
      const lastStart = [...preview.periodDays].reverse().find((d) => d.is_period_start);
      if (lastStart) {
        await supabase.from('profiles').update({ last_period_start: lastStart.date }).eq('id', user.id);
      }

      setResult({
        periodsInserted: periodRows.length,
        periodsSkipped,
        dailyInserted: dailyRows.length,
        dailySkipped,
      });
      setPhase('done');
      router.refresh();
    } catch (e: any) {
      setErr(e.message || 'Import failed. Please try again.');
      setPhase('error');
    }
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Drop zone / picker */}
      {(phase === 'idle' || phase === 'parsing' || phase === 'error') && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={[
            'rounded-3xl border-2 border-dashed p-8 text-center transition-colors',
            dragging ? 'border-rose-400 bg-rose-50/60' : 'border-cream-200 bg-cream-50/60',
          ].join(' ')}
        >
          <div className="mx-auto h-14 w-14 rounded-2xl bg-rose-100 grid place-items-center text-rose-500">
            <FileJson size={26} />
          </div>
          <p className="mt-4 font-serif text-2xl">Import your history</p>
          <p className="text-ink-600 text-sm mt-1">
            Drop your Flo data-export <span className="font-medium">.json</span> file here.
          </p>
          <button
            onClick={() => inputRef.current?.click()}
            disabled={phase === 'parsing'}
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-ink-900 text-cream-50 px-5 py-3 text-sm font-medium disabled:opacity-60"
          >
            {phase === 'parsing' ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {phase === 'parsing' ? 'Reading file…' : 'Choose file'}
          </button>
          <input ref={inputRef} type="file" accept=".json,application/json" onChange={onPick} className="hidden" />
          {fileName && phase !== 'parsing' && (
            <p className="text-xs text-ink-500 mt-3 truncate">Selected: {fileName}</p>
          )}
        </div>
      )}

      {err && (
        <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-2xl p-3 flex items-start gap-2">
          <X size={16} className="mt-0.5 shrink-0" /> {err}
        </p>
      )}

      {/* Preview */}
      {phase === 'preview' && preview && (
        <div className="space-y-5">
          <div className="rounded-3xl border border-cream-200 bg-cream-50/70 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-ink-500">Found in {fileName}</p>
            <div className="mt-3 grid grid-cols-3 gap-3 text-center">
              <Stat value={preview.cyclesDetected} label="cycles" />
              <Stat value={preview.periodDays.length} label="period days" />
              <Stat value={preview.dailyDays.length} label="symptom days" />
            </div>
            {preview.dateRange && (
              <p className="text-sm text-ink-600 mt-4 text-center">
                {fmt(preview.dateRange.from)} → {fmt(preview.dateRange.to)}
              </p>
            )}
          </div>

          {preview.warnings.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-2">
              {preview.warnings.map((w, i) => (
                <p key={i} className="text-sm text-amber-800 flex items-start gap-2">
                  <AlertTriangle size={15} className="mt-0.5 shrink-0" /> {w}
                </p>
              ))}
            </div>
          )}

          <p className="text-xs text-ink-500 leading-relaxed">
            Importing is safe: any day you&apos;ve already logged in Luna is left untouched. Only new
            dates from your file are added.
          </p>

          <div className="flex gap-2">
            <button
              onClick={runImport}
              disabled={preview.periodDays.length === 0 && preview.dailyDays.length === 0}
              className="flex-1 rounded-2xl bg-rose-500 text-cream-50 py-4 font-medium hover:bg-rose-600 transition disabled:opacity-60"
            >
              Import {preview.periodDays.length + preview.dailyDays.length} entries
            </button>
            <button
              onClick={reset}
              className="rounded-2xl border border-cream-200 px-5 py-4 text-sm text-ink-600 hover:bg-cream-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {phase === 'importing' && (
        <div className="rounded-3xl border border-cream-200 bg-cream-50/70 p-8 text-center">
          <Loader2 size={28} className="mx-auto animate-spin text-rose-500" />
          <p className="mt-3 text-ink-700">Importing your history…</p>
        </div>
      )}

      {/* Done */}
      {phase === 'done' && result && (
        <div className="space-y-5">
          <div className="rounded-3xl border border-sage-200 bg-sage-50 p-6 text-center">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-sage-100 grid place-items-center text-sage-500">
              <Check size={24} />
            </div>
            <p className="mt-3 font-serif text-2xl text-ink-900">All set.</p>
            <p className="text-sm text-ink-600 mt-2">
              Added {result.periodsInserted} period {result.periodsInserted === 1 ? 'day' : 'days'} and{' '}
              {result.dailyInserted} symptom {result.dailyInserted === 1 ? 'day' : 'days'}.
            </p>
            {(result.periodsSkipped > 0 || result.dailySkipped > 0) && (
              <p className="text-xs text-ink-500 mt-2">
                Skipped {result.periodsSkipped + result.dailySkipped} day(s) you&apos;d already logged.
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex-1 rounded-2xl bg-rose-500 text-cream-50 py-4 font-medium hover:bg-rose-600 transition"
            >
              See my dashboard
            </button>
            <button
              onClick={reset}
              className="rounded-2xl border border-cream-200 px-5 py-4 text-sm text-ink-600 hover:bg-cream-100"
            >
              Import another
            </button>
          </div>
        </div>
      )}

      {/* How-to */}
      {phase === 'idle' && (
        <div className="rounded-3xl border border-cream-200 bg-cream-50/50 p-5">
          <h3 className="font-serif text-lg">How to get your Flo file</h3>
          <ol className="mt-2 space-y-1.5 text-sm text-ink-600 list-decimal list-inside">
            <li>Open Flo → Menu (your avatar) → Help.</li>
            <li>Scroll down and tap “Contact us”, then request a data export.</li>
            <li>Flo emails you a <span className="font-medium">.json</span> file (choose JSON, not CSV).</li>
            <li>Download it, then upload it here.</li>
          </ol>
          <p className="text-xs text-ink-500 mt-3 leading-relaxed">
            Other apps that export plain JSON often work too. We map flow intensity and any matching
            symptoms &amp; moods automatically.
          </p>
        </div>
      )}
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl bg-cream-50 border border-cream-200 py-3">
      <p className="font-serif text-3xl text-rose-600 leading-none">{value}</p>
      <p className="text-[11px] uppercase tracking-wide text-ink-500 mt-1">{label}</p>
    </div>
  );
}

function fmt(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
