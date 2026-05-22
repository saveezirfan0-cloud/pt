import { addDays, differenceInCalendarDays, differenceInDays, format, parseISO } from 'date-fns';
import { extractCycleStarts, type PeriodLog } from '@/lib/cycle';

export type CycleRecord = {
  start: Date;
  end: Date | null; // start of next cycle minus 1 day
  cycleLength: number | null; // null for the most recent (still open) cycle
  periodLength: number;
  deviation: number | null; // cycleLength - average (signed)
};

export type RegularityLabel = 'regular' | 'mostly regular' | 'irregular' | 'unknown';

export type CycleHistoryStats = {
  totalStarts: number; // every cycle start we found
  completed: number; // cycles with a measurable length
  avgCycle: number | null;
  minCycle: number | null;
  maxCycle: number | null;
  stdDev: number | null;
  avgPeriod: number | null;
  regularity: RegularityLabel;
  variation: number | null; // max - min, days
  firstStart: Date | null;
  lastStart: Date | null;
};

function mean(xs: number[]): number {
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}

function stdev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
}

/**
 * Build a complete, ordered list of every cycle from the user's full period
 * history, plus summary statistics. Newest cycle is last in `records`.
 */
export function buildCycleHistory(periods: PeriodLog[]): {
  records: CycleRecord[];
  stats: CycleHistoryStats;
} {
  const starts = extractCycleStarts(periods); // ascending
  const logSet = new Set(periods.map((p) => p.date));

  // First pass: cycle + period lengths.
  const draft: Omit<CycleRecord, 'deviation'>[] = [];
  for (let i = 0; i < starts.length; i++) {
    const start = starts[i];
    const next = starts[i + 1] ?? null;
    const cycleLength = next ? differenceInDays(next, start) : null;
    const end = next ? addDays(next, -1) : null;

    let len = 1;
    let cursor = start;
    while (len <= 20) {
      const nd = addDays(cursor, 1);
      if (!logSet.has(format(nd, 'yyyy-MM-dd'))) break;
      len++;
      cursor = nd;
    }
    draft.push({ start, end, cycleLength, periodLength: len });
  }

  const validLens = draft
    .map((d) => d.cycleLength)
    .filter((n): n is number => n != null && n >= 15 && n <= 60);
  const validPeriods = draft.map((d) => d.periodLength).filter((n) => n >= 1 && n <= 20);

  const avgCycle = validLens.length ? Math.round(mean(validLens)) : null;
  const sd = validLens.length >= 2 ? stdev(validLens) : null;

  let regularity: RegularityLabel = 'unknown';
  if (sd != null && validLens.length >= 3) {
    regularity = sd <= 3 ? 'regular' : sd <= 6 ? 'mostly regular' : 'irregular';
  }

  const records: CycleRecord[] = draft.map((d) => ({
    ...d,
    deviation:
      d.cycleLength != null && avgCycle != null && d.cycleLength >= 15 && d.cycleLength <= 60
        ? d.cycleLength - avgCycle
        : null,
  }));

  const stats: CycleHistoryStats = {
    totalStarts: starts.length,
    completed: validLens.length,
    avgCycle,
    minCycle: validLens.length ? Math.min(...validLens) : null,
    maxCycle: validLens.length ? Math.max(...validLens) : null,
    stdDev: sd != null ? Math.round(sd * 10) / 10 : null,
    avgPeriod: validPeriods.length ? Math.round(mean(validPeriods)) : null,
    regularity,
    variation: validLens.length ? Math.max(...validLens) - Math.min(...validLens) : null,
    firstStart: starts[0] ?? null,
    lastStart: starts[starts.length - 1] ?? null,
  };

  return { records, stats };
}

export function regularityBlurb(stats: CycleHistoryStats): string {
  switch (stats.regularity) {
    case 'regular':
      return `Your cycles are very consistent — they vary by only about ${stats.stdDev} days.`;
    case 'mostly regular':
      return `Your cycles are fairly steady, varying by around ${stats.stdDev} days on average.`;
    case 'irregular':
      return `Your cycles vary quite a bit (about ${stats.stdDev} days). That's common, but worth a mention to a clinician if it bothers you.`;
    default:
      return 'Log a few more cycles to see how regular your pattern is.';
  }
}
