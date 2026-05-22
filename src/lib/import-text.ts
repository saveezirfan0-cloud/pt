import { addDays, differenceInCalendarDays, format, isValid, parseISO } from 'date-fns';
import {
  addDaily,
  addPeriodDay,
  buildPreview,
  FLOW_MAP,
  MOOD_MAP,
  MOOD_SET,
  newCollector,
  norm,
  numericFlow,
  SYMPTOM_MAP,
  SYMPTOM_SET,
  type Flow,
  type ImportPreview,
} from '@/lib/import';

/* ------------------------------------------------------------------ *
 * Flo TEXT export parser
 *
 * The Flo "Export my data" email delivers a .txt file with two sections:
 *
 *   cycle 0
 *   Period start date: 2013-03-20 00:00:00.0
 *   Period end date: 2013-03-24 00:00:00.0
 *   Pregnant: False
 *   Period intensity:
 *   Day 0: intensity: Medium        (optional, per-day)
 *   ---------------
 *   ... more cycles ...
 *   manual events
 *   0 - 2020-10-26 11:23:56.0 - 2020-10-26 11:23:56.0 - Symptom - DrawingPain -
 *   1 - 2017-01-11 15:28:06.0 - ... - Weight - N/A - 36.0
 *
 * Manual-event row layout (dash-separated):
 *   index - startDateTime - endDateTime - Type - Subtype - value
 * Types seen: Sleep, Water, Weight, Symptom, Mood, Fluid, Disturber.
 * We import Symptom + Mood (mapped to Luna's vocabulary); the rest
 * (Sleep/Water/Weight/Fluid/Disturber) have no home in Luna and are
 * counted as skipped.
 * ------------------------------------------------------------------ */

// Flo's CamelCase manual-event symptom names → Luna vocabulary.
const TEXT_SYMPTOM_MAP: Record<string, string> = {
  drawingpain: 'cramps',
  cramps: 'cramps',
  abdominalpain: 'cramps',
  headache: 'headache',
  migraine: 'headache',
  bloating: 'bloating',
  tenderbreasts: 'tender breasts',
  acne: 'acne',
  fatigue: 'fatigue',
  feelgood: '', // positive, no symptom equivalent → ignore (not "unknown")
  nausea: 'nausea',
  backache: 'back pain',
  backpain: 'back pain',
  cravings: 'cravings',
  insomnia: 'insomnia',
  constipation: '', // no Luna equivalent → treat as skip-not-warn
  diarrhea: '',
};

// Flo's manual-event mood names → Luna vocabulary.
const TEXT_MOOD_MAP: Record<string, string> = {
  happy: 'happy',
  joyful: 'happy',
  calm: 'calm',
  neutral: 'calm',
  energetic: 'energetic',
  sensitive: 'sensitive',
  moodswings: 'sensitive',
  irritable: 'irritable',
  angry: 'irritable',
  anxious: 'anxious',
  sad: 'sad',
  depressed: 'sad',
  low: 'low',
  apathetic: 'low',
};

// Event types we knowingly don't import (so they don't show as "unknown").
const IGNORED_TYPES = new Set(['sleep', 'water', 'weight', 'fluid', 'disturber']);

/** "2013-03-20 00:00:00.0" → "2013-03-20" (date part only, no TZ shift). */
function dateOnly(s: string): string | null {
  const m = s.trim().match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const iso = `${m[1]}-${m[2]}-${m[3]}`;
  return isValid(parseISO(iso)) ? iso : null;
}

export function isFloTextExport(text: string): boolean {
  const head = text.slice(0, 4000).toLowerCase();
  return (
    /^\s*cycle\s+\d+/m.test(head) ||
    head.includes('period start date:') ||
    head.includes('manual events')
  );
}

export function parseFloText(text: string): ImportPreview {
  const c = newCollector();
  const lines = text.split(/\r?\n/);

  let i = 0;

  // ---- Section 1: cycles -------------------------------------------------
  let cur: {
    start: string | null;
    end: string | null;
    intensity: string | null;
    pregnant: boolean;
    dayIntensities: Map<number, Flow>;
  } | null = null;

  const flushCycle = () => {
    if (!cur || !cur.start) {
      cur = null;
      return;
    }
    // Skip pregnancy "cycles" (no real period to import, and Flo flags them).
    if (cur.pregnant) {
      cur = null;
      return;
    }
    const start = cur.start;
    // Number of bleeding days from end date (clamped), else default span.
    let days = 5;
    if (cur.end) {
      const diff = differenceInCalendarDays(parseISO(cur.end), parseISO(start));
      if (diff >= 0 && diff <= 20) days = diff + 1;
    }
    const baseFlow: Flow = (cur.intensity && FLOW_MAP[norm(cur.intensity)]) || 'medium';
    for (let d = 0; d < Math.max(days, 1); d++) {
      const date = format(addDays(parseISO(start), d), 'yyyy-MM-dd');
      const flow = cur.dayIntensities.get(d) ?? baseFlow;
      addPeriodDay(c, date, flow);
    }
    cur = null;
  };

  for (; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();
    if (!line) continue;

    if (/^manual events\b/i.test(line)) break; // move to section 2

    if (/^cycle\s+\d+/i.test(line)) {
      flushCycle();
      cur = { start: null, end: null, intensity: null, pregnant: false, dayIntensities: new Map() };
      continue;
    }
    if (line === '---------------') {
      flushCycle();
      continue;
    }
    if (!cur) continue;

    let m: RegExpMatchArray | null;
    if ((m = line.match(/^Period start date:\s*(.*)$/i))) {
      cur.start = dateOnly(m[1]);
    } else if ((m = line.match(/^Period end date:\s*(.*)$/i))) {
      cur.end = dateOnly(m[1]);
    } else if ((m = line.match(/^Pregnant:\s*(.*)$/i))) {
      cur.pregnant = /true/i.test(m[1]);
    } else if ((m = line.match(/^Period intensity:\s*(.*)$/i))) {
      const val = m[1].trim();
      if (val) cur.intensity = val;
    } else if ((m = line.match(/^Day\s+(\d+):\s*intensity:\s*(.*)$/i))) {
      const dayIdx = parseInt(m[1], 10);
      const f = FLOW_MAP[norm(m[2])];
      if (!Number.isNaN(dayIdx) && f) cur.dayIntensities.set(dayIdx, f);
    }
    // "Pregnancy end reason: N" and anything else is ignored.
  }
  flushCycle();

  // ---- Section 2: manual events -----------------------------------------
  for (; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || /^manual events\b/i.test(line)) continue;

    // index - start - end - Type - Subtype - value
    // Rows often end with a dangling " -" (empty value) which, after trim,
    // has no trailing space for the separator regex to catch. Strip a final
    // " -" first, then split on dash-with-spaces.
    const cleaned = line.replace(/\s+-\s*$/, '');
    const parts = cleaned.split(/\s+-\s+/);
    if (parts.length < 5) continue;

    const date = dateOnly(parts[1]);
    if (!date) continue;
    const type = parts[3].trim().toLowerCase();
    const subtype = (parts[4] ?? '').trim();
    const value = (parts[5] ?? '').trim();

    if (type === 'symptom') {
      const key = norm(subtype);
      if (key in TEXT_SYMPTOM_MAP) {
        const mapped = TEXT_SYMPTOM_MAP[key];
        if (mapped) addDaily(c, date, [mapped], []);
      } else if (SYMPTOM_MAP[key]) {
        addDaily(c, date, [SYMPTOM_MAP[key]], []);
      } else if (SYMPTOM_SET.has(subtype.toLowerCase())) {
        addDaily(c, date, [subtype.toLowerCase()], []);
      } else if (subtype && subtype !== 'N/A') {
        c.unknownTokens.add(subtype);
      }
    } else if (type === 'mood') {
      const key = norm(subtype);
      if (key in TEXT_MOOD_MAP) {
        const mapped = TEXT_MOOD_MAP[key];
        if (mapped) addDaily(c, date, [], [mapped]);
      } else if (MOOD_MAP[key]) {
        addDaily(c, date, [], [MOOD_MAP[key]]);
      } else if (MOOD_SET.has(subtype.toLowerCase())) {
        addDaily(c, date, [], [subtype.toLowerCase()]);
      } else if (subtype && subtype !== 'N/A') {
        c.unknownTokens.add(subtype);
      }
    }
    // Sleep / Water / Weight / Fluid / Disturber → intentionally skipped.
    // (value/numericFlow kept available for future use.)
    void value;
    void numericFlow;
  }

  return buildPreview(c, 'text');
}
