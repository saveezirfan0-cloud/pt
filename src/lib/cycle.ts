import {
  addDays,
  differenceInDays,
  format,
  isWithinInterval,
  parseISO,
  startOfDay,
} from 'date-fns';

export type PeriodLog = {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  flow: 'spotting' | 'light' | 'medium' | 'heavy';
  is_period_start: boolean;
  notes: string | null;
};

export type DailyLog = {
  id: string;
  user_id: string;
  date: string;
  mood: string[];
  symptoms: string[];
  symptom_details?: Record<string, number> | null;
  energy_level: number | null;
  sleep_hours: number | null;
  notes: string | null;
};

export type CycleInfo = {
  lastPeriodStart: Date | null;
  cycleLength: number;
  periodLength: number;
  currentDay: number | null; // day-of-cycle today
  nextPeriodStart: Date | null;
  nextPeriodEnd: Date | null;
  ovulationDate: Date | null;
  fertileWindowStart: Date | null;
  fertileWindowEnd: Date | null;
  phase: 'menstrual' | 'follicular' | 'ovulation' | 'luteal' | 'unknown';
  daysUntilNext: number | null;
  recentCycles: { start: Date; length: number }[];
};

/**
 * Identify period-start dates from a sorted-asc list of period logs.
 * A "start" is a log whose date is more than 2 days after the previous log
 * (so consecutive bleeding days collapse into one cycle start).
 */
export function extractCycleStarts(logs: PeriodLog[]): Date[] {
  if (logs.length === 0) return [];
  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
  const starts: Date[] = [];
  let prev: Date | null = null;
  for (const log of sorted) {
    const d = parseISO(log.date);
    if (log.is_period_start) {
      starts.push(d);
      prev = d;
      continue;
    }
    if (!prev || differenceInDays(d, prev) > 2) {
      starts.push(d);
    }
    prev = d;
  }
  return starts;
}

export function computeCycleInfo(
  logs: PeriodLog[],
  fallbackCycleLength = 28,
  fallbackPeriodLength = 5,
  today: Date = new Date()
): CycleInfo {
  const todayStart = startOfDay(today);
  const starts = extractCycleStarts(logs);

  // Compute observed cycle lengths from consecutive starts.
  const recentCycles: { start: Date; length: number }[] = [];
  for (let i = 1; i < starts.length; i++) {
    const length = differenceInDays(starts[i], starts[i - 1]);
    if (length >= 15 && length <= 60) {
      recentCycles.push({ start: starts[i - 1], length });
    }
  }
  const last6 = recentCycles.slice(-6);
  const avgCycle =
    last6.length > 0
      ? Math.round(last6.reduce((s, c) => s + c.length, 0) / last6.length)
      : fallbackCycleLength;

  // Period length: count consecutive logged days per cycle, average last 3.
  const periodLengths: number[] = [];
  const sortedLogs = [...logs].sort((a, b) => a.date.localeCompare(b.date));
  for (const start of starts) {
    let len = 1;
    let cursor = start;
    while (true) {
      const next = addDays(cursor, 1);
      const found = sortedLogs.find(
        (l) => parseISO(l.date).getTime() === next.getTime()
      );
      if (!found) break;
      len++;
      cursor = next;
      if (len > 14) break;
    }
    periodLengths.push(len);
  }
  const last3p = periodLengths.slice(-3);
  const avgPeriod =
    last3p.length > 0
      ? Math.round(last3p.reduce((s, l) => s + l, 0) / last3p.length)
      : fallbackPeriodLength;

  const lastStart = starts[starts.length - 1] ?? null;

  if (!lastStart) {
    return {
      lastPeriodStart: null,
      cycleLength: avgCycle,
      periodLength: avgPeriod,
      currentDay: null,
      nextPeriodStart: null,
      nextPeriodEnd: null,
      ovulationDate: null,
      fertileWindowStart: null,
      fertileWindowEnd: null,
      phase: 'unknown',
      daysUntilNext: null,
      recentCycles,
    };
  }

  const daysSinceStart = differenceInDays(todayStart, startOfDay(lastStart));
  const currentDay = daysSinceStart >= 0 ? daysSinceStart + 1 : null;
  const nextPeriodStart = addDays(lastStart, avgCycle);
  const nextPeriodEnd = addDays(nextPeriodStart, avgPeriod - 1);

  // Ovulation ~14 days before next period; fertile window = -5 .. +1 of ovulation.
  const ovulationDate = addDays(nextPeriodStart, -14);
  const fertileWindowStart = addDays(ovulationDate, -5);
  const fertileWindowEnd = addDays(ovulationDate, 1);

  let phase: CycleInfo['phase'] = 'unknown';
  if (currentDay !== null) {
    if (currentDay <= avgPeriod) phase = 'menstrual';
    else if (
      isWithinInterval(todayStart, {
        start: startOfDay(fertileWindowStart),
        end: startOfDay(fertileWindowEnd),
      })
    )
      phase = 'ovulation';
    else if (todayStart < startOfDay(ovulationDate)) phase = 'follicular';
    else phase = 'luteal';
  }

  const daysUntilNext = differenceInDays(startOfDay(nextPeriodStart), todayStart);

  return {
    lastPeriodStart: lastStart,
    cycleLength: avgCycle,
    periodLength: avgPeriod,
    currentDay,
    nextPeriodStart,
    nextPeriodEnd,
    ovulationDate,
    fertileWindowStart,
    fertileWindowEnd,
    phase,
    daysUntilNext,
    recentCycles,
  };
}

export function toDateKey(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

export const PHASE_LABELS: Record<CycleInfo['phase'], string> = {
  menstrual: 'Menstrual',
  follicular: 'Follicular',
  ovulation: 'Ovulation',
  luteal: 'Luteal',
  unknown: 'Log your first period to see insights',
};

export const PHASE_DESCRIPTIONS: Record<CycleInfo['phase'], string> = {
  menstrual: 'Be gentle with yourself. Rest, hydrate, and listen to your body.',
  follicular: 'Energy is rising. A good time for new projects and movement.',
  ovulation: 'Peak energy and fertility. You may feel social and confident.',
  luteal: 'Wind-down phase. Watch for PMS, prioritize sleep and nourishment.',
  unknown: '',
};

export const FLOW_COLORS: Record<PeriodLog['flow'], string> = {
  spotting: '#F5C2B8',
  light: '#EB9988',
  medium: '#C84A30',
  heavy: '#822A18',
};

export const SYMPTOM_OPTIONS = [
  'cramps',
  'headache',
  'bloating',
  'tender breasts',
  'acne',
  'fatigue',
  'nausea',
  'back pain',
  'cravings',
  'insomnia',
];

export const MOOD_OPTIONS = [
  'happy',
  'calm',
  'energetic',
  'sensitive',
  'irritable',
  'anxious',
  'sad',
  'low',
];
