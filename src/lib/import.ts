import { addDays, differenceInCalendarDays, format, isValid, parseISO } from 'date-fns';
import { MOOD_OPTIONS, SYMPTOM_OPTIONS, type PeriodLog } from '@/lib/cycle';

type Flow = PeriodLog['flow'];

export type ParsedPeriodDay = {
  date: string; // YYYY-MM-DD
  flow: Flow;
  is_period_start: boolean;
};

export type ParsedDailyDay = {
  date: string;
  symptoms: string[];
  mood: string[];
  notes: string | null;
};

export type ImportPreview = {
  periodDays: ParsedPeriodDay[];
  dailyDays: ParsedDailyDay[];
  cyclesDetected: number;
  dateRange: { from: string; to: string } | null;
  warnings: string[];
};

/* ------------------------------------------------------------------ *
 * Value mapping tables
 * ------------------------------------------------------------------ */

// Flo + common synonyms → our four-step flow scale.
const FLOW_MAP: Record<string, Flow> = {
  spotting: 'spotting',
  spot: 'spotting',
  very_light: 'spotting',
  light: 'light',
  low: 'light',
  normal: 'medium',
  medium: 'medium',
  moderate: 'medium',
  heavy: 'heavy',
  high: 'heavy',
  very_heavy: 'heavy',
  super_heavy: 'heavy',
  blood_clots: 'heavy',
  clots: 'heavy',
};

// Numeric intensity (1..4 or 1..5) → flow.
function numericFlow(n: number): Flow | null {
  if (n <= 0) return null;
  if (n === 1) return 'spotting';
  if (n === 2) return 'light';
  if (n === 3) return 'medium';
  return 'heavy';
}

// Flo symptom tokens / synonyms → our SYMPTOM_OPTIONS vocabulary.
const SYMPTOM_MAP: Record<string, string> = {
  cramps: 'cramps',
  cramp: 'cramps',
  abdominal_cramps: 'cramps',
  menstrual_cramps: 'cramps',
  headache: 'headache',
  migraine: 'headache',
  bloating: 'bloating',
  bloated: 'bloating',
  tender_breasts: 'tender breasts',
  breast_tenderness: 'tender breasts',
  sore_breasts: 'tender breasts',
  acne: 'acne',
  acne_skin: 'acne',
  skin_acne: 'acne',
  fatigue: 'fatigue',
  tiredness: 'fatigue',
  tired: 'fatigue',
  low_energy: 'fatigue',
  nausea: 'nausea',
  nauseous: 'nausea',
  back_pain: 'back pain',
  backache: 'back pain',
  back_ache: 'back pain',
  lower_back_pain: 'back pain',
  cravings: 'cravings',
  food_cravings: 'cravings',
  insomnia: 'insomnia',
  sleeplessness: 'insomnia',
  trouble_sleeping: 'insomnia',
};

// Flo mood tokens / synonyms → our MOOD_OPTIONS vocabulary.
const MOOD_MAP: Record<string, string> = {
  happy: 'happy',
  joyful: 'happy',
  calm: 'calm',
  relaxed: 'calm',
  energetic: 'energetic',
  energized: 'energetic',
  sensitive: 'sensitive',
  emotional: 'sensitive',
  mood_swings: 'sensitive',
  irritable: 'irritable',
  irritated: 'irritable',
  angry: 'irritable',
  anxious: 'anxious',
  anxiety: 'anxious',
  nervous: 'anxious',
  sad: 'sad',
  unhappy: 'sad',
  depressed: 'sad',
  low: 'low',
  apathetic: 'low',
  drained: 'low',
};

const SYMPTOM_SET = new Set(SYMPTOM_OPTIONS);
const MOOD_SET = new Set(MOOD_OPTIONS);

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

function norm(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[\s\-/]+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

const DATE_KEYS = [
  'date',
  'point_date',
  'day',
  'log_date',
  'event_date',
  'calendar_date',
  'timestamp',
];

const START_KEYS = [
  'period_start_date',
  'period_start',
  'start_date',
  'cycle_start_date',
  'cycle_start',
  'start',
  'menstruation_start',
];

const END_KEYS = ['period_end_date', 'period_end', 'end_date', 'end', 'menstruation_end'];

const LENGTH_KEYS = ['period_length', 'period_duration', 'menstruation_length', 'bleeding_days'];

const FLOW_KEYS = [
  'flow',
  'period_intensity',
  'intensity',
  'menstrual_flow',
  'menstruation',
  'bleeding',
  'menstrual_intensity',
];

/** Try to read a YYYY-MM-DD date string from an object using any known key. */
function readDate(obj: Record<string, unknown>): string | null {
  for (const k of Object.keys(obj)) {
    if (DATE_KEYS.includes(norm(k))) {
      const v = obj[k];
      const iso = toIso(v);
      if (iso) return iso;
    }
  }
  return null;
}

function toIso(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === 'number') {
    // epoch seconds or millis
    const ms = v < 1e12 ? v * 1000 : v;
    const d = new Date(ms);
    return isValid(d) ? format(d, 'yyyy-MM-dd') : null;
  }
  if (typeof v === 'string') {
    const s = v.trim();
    if (!s) return null;
    // Plain YYYY-MM-DD (possibly with time) — parse the date part directly to avoid TZ shifts.
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    const d = parseISO(s);
    if (isValid(d)) return format(d, 'yyyy-MM-dd');
    const d2 = new Date(s);
    return isValid(d2) ? format(d2, 'yyyy-MM-dd') : null;
  }
  return null;
}

function readFlow(obj: Record<string, unknown>): Flow | null {
  for (const k of Object.keys(obj)) {
    if (FLOW_KEYS.includes(norm(k))) {
      const v = obj[k];
      if (typeof v === 'number') {
        const f = numericFlow(v);
        if (f) return f;
      }
      if (typeof v === 'boolean') {
        if (v) return 'medium';
      }
      if (typeof v === 'string') {
        const f = FLOW_MAP[norm(v)];
        if (f) return f;
      }
    }
  }
  return null;
}

/** Collect symptom + mood tokens from an object (string fields and arrays). */
function readSymptomsAndMoods(obj: Record<string, unknown>): {
  symptoms: string[];
  mood: string[];
  unknown: string[];
} {
  const symptoms = new Set<string>();
  const mood = new Set<string>();
  const unknown = new Set<string>();

  const consider = (raw: unknown) => {
    if (typeof raw !== 'string') return;
    const token = norm(raw);
    if (!token) return;
    if (SYMPTOM_MAP[token]) return void symptoms.add(SYMPTOM_MAP[token]);
    if (MOOD_MAP[token]) return void mood.add(MOOD_MAP[token]);
    // direct matches against our own vocabulary (e.g. simple/generic exports)
    const spaced = raw.toLowerCase().trim();
    if (SYMPTOM_SET.has(spaced)) return void symptoms.add(spaced);
    if (MOOD_SET.has(spaced)) return void mood.add(spaced);
    // ignore obvious non-symptom tokens
    if (['true', 'false', 'none', 'null', ''].includes(token)) return;
    unknown.add(raw.toLowerCase().trim());
  };

  for (const [k, v] of Object.entries(obj)) {
    const nk = norm(k);
    const looksLikeSymptomField =
      nk.includes('symptom') ||
      nk.includes('mood') ||
      nk.includes('feeling') ||
      nk === 'tags' ||
      nk === 'events' ||
      nk === 'point_events';
    if (Array.isArray(v)) {
      for (const item of v) {
        if (typeof item === 'string') consider(item);
        else if (item && typeof item === 'object') {
          const o = item as Record<string, unknown>;
          consider((o.name ?? o.type ?? o.value ?? o.key) as unknown);
        }
      }
    } else if (looksLikeSymptomField) {
      consider(v);
    }
  }

  return {
    symptoms: [...symptoms],
    mood: [...mood],
    unknown: [...unknown],
  };
}

/* ------------------------------------------------------------------ *
 * Recursive scan
 * ------------------------------------------------------------------ */

type Collector = {
  periods: Map<string, Flow>; // date -> flow (last write wins)
  dailySymptoms: Map<string, Set<string>>;
  dailyMoods: Map<string, Set<string>>;
  unknownTokens: Set<string>;
};

function addPeriodDay(c: Collector, date: string, flow: Flow) {
  const existing = c.periods.get(date);
  // keep the heavier of the two if a date is seen twice
  const order: Flow[] = ['spotting', 'light', 'medium', 'heavy'];
  if (!existing || order.indexOf(flow) > order.indexOf(existing)) {
    c.periods.set(date, flow);
  }
}

function addDaily(c: Collector, date: string, symptoms: string[], mood: string[]) {
  if (symptoms.length) {
    const set = c.dailySymptoms.get(date) ?? new Set<string>();
    symptoms.forEach((s) => set.add(s));
    c.dailySymptoms.set(date, set);
  }
  if (mood.length) {
    const set = c.dailyMoods.get(date) ?? new Set<string>();
    mood.forEach((m) => set.add(m));
    c.dailyMoods.set(date, set);
  }
}

function expandCycle(obj: Record<string, unknown>): { date: string; flow: Flow }[] {
  // Find a start date.
  let start: string | null = null;
  for (const k of Object.keys(obj)) {
    if (START_KEYS.includes(norm(k))) {
      start = toIso(obj[k]);
      if (start) break;
    }
  }
  if (!start) return [];

  // Determine number of bleeding days from end date or a length field.
  let days = 0;
  for (const k of Object.keys(obj)) {
    if (END_KEYS.includes(norm(k))) {
      const end = toIso(obj[k]);
      if (end) {
        const diff = differenceInCalendarDays(parseISO(end), parseISO(start));
        if (diff >= 0 && diff <= 20) days = diff + 1;
      }
    }
  }
  if (!days) {
    for (const k of Object.keys(obj)) {
      if (LENGTH_KEYS.includes(norm(k))) {
        const v = obj[k];
        if (typeof v === 'number' && v >= 1 && v <= 20) days = Math.round(v);
      }
    }
  }
  if (!days) days = 0; // unknown length → just mark the start day

  const flow = readFlow(obj) ?? 'medium';
  const out: { date: string; flow: Flow }[] = [];
  const total = Math.max(days, 1);
  for (let i = 0; i < total; i++) {
    out.push({ date: format(addDays(parseISO(start), i), 'yyyy-MM-dd'), flow });
  }
  return out;
}

function looksLikeCycle(obj: Record<string, unknown>): boolean {
  const keys = Object.keys(obj).map(norm);
  const hasStart = keys.some((k) => START_KEYS.includes(k));
  const hasEndOrLen = keys.some((k) => END_KEYS.includes(k) || LENGTH_KEYS.includes(k));
  return hasStart && (hasEndOrLen || keys.some((k) => FLOW_KEYS.includes(k)));
}

function scan(node: unknown, c: Collector, depth = 0) {
  if (node == null || depth > 8) return;

  if (Array.isArray(node)) {
    for (const item of node) scan(item, c, depth + 1);
    return;
  }

  if (typeof node !== 'object') return;
  const obj = node as Record<string, unknown>;

  // 1) Cycle-shaped object → expand into bleeding days.
  if (looksLikeCycle(obj)) {
    for (const { date, flow } of expandCycle(obj)) addPeriodDay(c, date, flow);
  }

  // 2) Per-day object → date + flow and/or symptoms/moods.
  const date = readDate(obj);
  if (date) {
    const flow = readFlow(obj);
    if (flow) addPeriodDay(c, date, flow);
    const { symptoms, mood, unknown } = readSymptomsAndMoods(obj);
    addDaily(c, date, symptoms, mood);
    unknown.forEach((u) => c.unknownTokens.add(u));
  }

  // 3) Recurse into nested structures.
  for (const v of Object.values(obj)) {
    if (v && typeof v === 'object') scan(v, c, depth + 1);
  }
}

/* ------------------------------------------------------------------ *
 * Public entry point
 * ------------------------------------------------------------------ */

export function parseFloExport(raw: unknown): ImportPreview {
  const warnings: string[] = [];
  const c: Collector = {
    periods: new Map(),
    dailySymptoms: new Map(),
    dailyMoods: new Map(),
    unknownTokens: new Set(),
  };

  scan(raw, c);

  // Build sorted period days and detect cycle starts (gap > 2 days).
  const periodDates = [...c.periods.keys()].sort();
  const periodDays: ParsedPeriodDay[] = [];
  let prev: string | null = null;
  let cyclesDetected = 0;
  for (const date of periodDates) {
    const isStart = !prev || differenceInCalendarDays(parseISO(date), parseISO(prev)) > 2;
    if (isStart) cyclesDetected++;
    periodDays.push({ date, flow: c.periods.get(date)!, is_period_start: isStart });
    prev = date;
  }

  // Build daily entries (union of symptom + mood dates).
  const dailyDates = new Set<string>([...c.dailySymptoms.keys(), ...c.dailyMoods.keys()]);
  const dailyDays: ParsedDailyDay[] = [...dailyDates].sort().map((date) => ({
    date,
    symptoms: [...(c.dailySymptoms.get(date) ?? [])],
    mood: [...(c.dailyMoods.get(date) ?? [])],
    notes: null,
  }));

  // Date range across everything.
  const allDates = [...periodDates, ...dailyDates].sort();
  const dateRange =
    allDates.length > 0 ? { from: allDates[0], to: allDates[allDates.length - 1] } : null;

  if (periodDays.length === 0 && dailyDays.length === 0) {
    warnings.push(
      'No period or symptom data was recognized in this file. Make sure it is a Flo data-export JSON (or a supported format).'
    );
  }
  if (c.unknownTokens.size > 0) {
    const sample = [...c.unknownTokens].slice(0, 8).join(', ');
    warnings.push(
      `${c.unknownTokens.size} symptom/mood type(s) didn't map to Luna's options and were skipped (e.g. ${sample}).`
    );
  }

  return { periodDays, dailyDays, cyclesDetected, dateRange, warnings };
}
