import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import type { PeriodLog } from '@/lib/cycle';

export type Madhhab = 'hanafi' | 'shafii' | 'maliki' | 'hanbali' | 'jafari' | 'custom';

export type IslamicSettings = {
  enabled: boolean;
  madhhab: Madhhab;
  min_hayd: number;
  max_hayd: number;
  min_tuhr: number;
  max_nifas: number;
  ghusl_reminders: boolean;
};

export type DayState = 'hayd' | 'nifas' | 'istihada' | 'purity';

/**
 * Commonly-cited, SIMPLIFIED day-limits per school. These are configurable
 * defaults — schools have internal nuance and scholars differ. They are used
 * only to flag possibilities, never to issue rulings.
 */
export const MADHHAB_DEFAULTS: Record<
  Exclude<Madhhab, 'custom'>,
  { min_hayd: number; max_hayd: number; min_tuhr: number; max_nifas: number; label: string }
> = {
  hanafi: { min_hayd: 3, max_hayd: 10, min_tuhr: 15, max_nifas: 40, label: 'Hanafi' },
  shafii: { min_hayd: 1, max_hayd: 15, min_tuhr: 15, max_nifas: 60, label: "Shafi'i" },
  maliki: { min_hayd: 1, max_hayd: 15, min_tuhr: 15, max_nifas: 60, label: 'Maliki' },
  hanbali: { min_hayd: 1, max_hayd: 15, min_tuhr: 13, max_nifas: 40, label: 'Hanbali' },
  jafari: { min_hayd: 3, max_hayd: 10, min_tuhr: 10, max_nifas: 10, label: "Ja'fari" },
};

export const MADHHAB_LABELS: Record<Madhhab, string> = {
  hanafi: 'Hanafi',
  shafii: "Shafi'i",
  maliki: 'Maliki',
  hanbali: 'Hanbali',
  jafari: "Ja'fari",
  custom: 'Custom',
};

export const STATE_META: Record<DayState, { label: string; color: string; tone: string }> = {
  hayd: { label: 'Menstruation (hayd)', color: 'rgb(var(--rose-500))', tone: 'excused' },
  nifas: { label: 'Postnatal (nifas)', color: 'rgb(var(--mauve-500))', tone: 'excused' },
  istihada: { label: 'Irregular (istihada)', color: 'rgb(var(--sage-400))', tone: 'not excused' },
  purity: { label: 'Purity (tuhr)', color: 'rgb(var(--cream-200))', tone: 'as normal' },
};

export type ClassifiedDay = { date: string; state: DayState };

export type Episode = {
  start: string;
  end: string; // last bleeding day
  type: 'hayd' | 'nifas';
  haydOrNifasDays: string[]; // counted as excused
  istihadaDays: string[]; // overflow beyond the max
};

type BirthEvent = { date: string }; // pregnancy end with reason 'birth'

/**
 * Group bleeding logs into consecutive episodes (≤1 clean day tolerated inside
 * an episode, so brief pauses/spotting don't split it).
 */
function buildEpisodes(periods: PeriodLog[]): { start: string; days: string[] }[] {
  const dates = [...new Set(periods.map((p) => p.date))].sort();
  const episodes: { start: string; days: string[] }[] = [];
  let cur: string[] = [];
  let prev: Date | null = null;
  for (const d of dates) {
    const dt = parseISO(d);
    if (prev && differenceInCalendarDays(dt, prev) > 2) {
      if (cur.length) episodes.push({ start: cur[0], days: cur });
      cur = [];
    }
    cur.push(d);
    prev = dt;
  }
  if (cur.length) episodes.push({ start: cur[0], days: cur });
  return episodes;
}

/**
 * Classify every bleeding episode as hayd or nifas, splitting any overflow
 * beyond the school's maximum into istihada. An episode is nifas if it begins
 * within ~4 days after a recorded birth.
 */
export function classifyEpisodes(
  periods: PeriodLog[],
  births: BirthEvent[],
  s: IslamicSettings
): Episode[] {
  const raw = buildEpisodes(periods);
  const birthDates = births.map((b) => parseISO(b.date));

  return raw.map((ep) => {
    const startDt = parseISO(ep.start);
    const isNifas = birthDates.some((b) => {
      const diff = differenceInCalendarDays(startDt, b);
      return diff >= 0 && diff <= 4;
    });
    const max = isNifas ? s.max_nifas : s.max_hayd;

    // Count the span from first to last bleeding day (inclusive), and mark days
    // beyond `max` (by day-of-episode index) as istihada.
    const allDays = ep.days;
    const haydOrNifasDays: string[] = [];
    const istihadaDays: string[] = [];
    for (const d of allDays) {
      const idx = differenceInCalendarDays(parseISO(d), startDt) + 1; // 1-based
      if (idx <= max) haydOrNifasDays.push(d);
      else istihadaDays.push(d);
    }
    return {
      start: ep.start,
      end: allDays[allDays.length - 1],
      type: isNifas ? 'nifas' : 'hayd',
      haydOrNifasDays,
      istihadaDays,
    };
  });
}

/** A per-date map of state for quick lookup (bleeding days only; rest = purity). */
export function classifiedDayMap(episodes: Episode[]): Map<string, DayState> {
  const m = new Map<string, DayState>();
  for (const ep of episodes) {
    for (const d of ep.haydOrNifasDays) m.set(d, ep.type);
    for (const d of ep.istihadaDays) m.set(d, 'istihada');
  }
  return m;
}

export function stateForDate(dateISO: string, map: Map<string, DayState>): DayState {
  return map.get(dateISO) ?? 'purity';
}

export type TodayStatus = {
  state: DayState;
  excused: boolean; // prayer/fasting excused
  headline: string;
  detail: string;
  ghuslDue: boolean; // bleeding just ended → suggest ghusl
};

/** Build today's organisational status + an optional ghusl prompt. */
export function todayStatus(
  todayISO: string,
  map: Map<string, DayState>,
  episodes: Episode[]
): TodayStatus {
  const state = stateForDate(todayISO, map);
  const excused = state === 'hayd' || state === 'nifas';

  // Ghusl due if yesterday was hayd/nifas and today is purity (bleeding ended).
  const yest = format(addDays(parseISO(todayISO), -1), 'yyyy-MM-dd');
  const yState = stateForDate(yest, map);
  const ghuslDue = state === 'purity' && (yState === 'hayd' || yState === 'nifas');

  let headline = '';
  let detail = '';
  if (state === 'hayd') {
    headline = 'Prayer & fasting are excused today';
    detail = 'You are in menstruation (hayd). Missed obligatory fasts are typically made up later.';
  } else if (state === 'nifas') {
    headline = 'Prayer & fasting are excused today';
    detail = 'You are in postnatal bleeding (nifas). Missed obligatory fasts are typically made up later.';
  } else if (state === 'istihada') {
    headline = 'Prayer & fasting resume (istihada)';
    detail =
      'This bleeding falls outside the menstruation window for your settings, so it may be istihada — in which case prayer and fasting continue. Please confirm with a scholar.';
  } else {
    headline = 'Prayer & fasting as normal';
    detail = 'You are in a state of purity (tuhr).';
  }

  return { state, excused, headline, detail, ghuslDue };
}
