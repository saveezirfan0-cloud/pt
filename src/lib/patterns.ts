import { addDays, differenceInDays, parseISO } from 'date-fns';
import { extractCycleStarts, type CycleInfo, type DailyLog, type PeriodLog } from '@/lib/cycle';

export type Phase = 'menstrual' | 'follicular' | 'ovulation' | 'luteal';
export const PHASES: Phase[] = ['menstrual', 'follicular', 'ovulation', 'luteal'];
export const PHASE_NAMES: Record<Phase, string> = {
  menstrual: 'menstrual',
  follicular: 'follicular',
  ovulation: 'ovulation',
  luteal: 'luteal',
};

export type Insight = {
  id: string;
  text: string;
  tone: 'neutral' | 'positive' | 'watch';
};

export type SymptomPhaseMatrix = {
  symptoms: string[];
  // counts[symptom][phase] = number of days that symptom logged in that phase
  counts: Record<string, Record<Phase, number>>;
  phaseTotals: Record<Phase, number>; // logged days per phase
};

/**
 * Assign a cycle phase to an arbitrary date using the user's period-start
 * history and average cycle/period lengths. Mirrors computeCycleInfo's model.
 */
export function phaseForDate(
  dateISO: string,
  starts: Date[],
  avgPeriod: number,
  avgCycle: number
): Phase | null {
  if (starts.length === 0) return null;
  const date = parseISO(dateISO);

  // Find the cycle this date belongs to: the latest start on/before date.
  let cycleStart: Date | null = null;
  for (let i = starts.length - 1; i >= 0; i--) {
    if (starts[i].getTime() <= date.getTime()) {
      cycleStart = starts[i];
      break;
    }
  }
  if (!cycleStart) return null;

  const dayOfCycle = differenceInDays(date, cycleStart) + 1; // 1-based
  if (dayOfCycle < 1 || dayOfCycle > avgCycle + 10) return null; // too far past = unknown

  const ovulationDay = avgCycle - 14; // days from start
  if (dayOfCycle <= avgPeriod) return 'menstrual';
  if (dayOfCycle >= ovulationDay - 1 && dayOfCycle <= ovulationDay + 1) return 'ovulation';
  if (dayOfCycle < ovulationDay - 1) return 'follicular';
  return 'luteal';
}

/** Build the symptom × phase frequency matrix across all daily logs. */
export function buildSymptomPhaseMatrix(
  periods: PeriodLog[],
  dailies: DailyLog[],
  avgPeriod: number,
  avgCycle: number
): SymptomPhaseMatrix {
  const starts = extractCycleStarts(periods);
  const counts: Record<string, Record<Phase, number>> = {};
  const phaseTotals: Record<Phase, number> = {
    menstrual: 0,
    follicular: 0,
    ovulation: 0,
    luteal: 0,
  };
  const symptomSet = new Set<string>();

  for (const d of dailies) {
    const phase = phaseForDate(d.date, starts, avgPeriod, avgCycle);
    if (!phase) continue;
    phaseTotals[phase] += 1;
    for (const s of d.symptoms) {
      symptomSet.add(s);
      counts[s] ??= { menstrual: 0, follicular: 0, ovulation: 0, luteal: 0 };
      counts[s][phase] += 1;
    }
  }

  const symptoms = [...symptomSet].sort(
    (a, b) =>
      sum(counts[b]) - sum(counts[a])
  );
  return { symptoms, counts, phaseTotals };
}

function sum(r: Record<Phase, number>): number {
  return r.menstrual + r.follicular + r.ovulation + r.luteal;
}

/**
 * Generate natural-language insights from logged patterns. These are
 * deterministic, rule-based observations (not an LLM) — the same engine
 * mainstream apps brand as "AI insights".
 */
export function generateInsights(
  info: CycleInfo,
  periods: PeriodLog[],
  dailies: DailyLog[]
): Insight[] {
  const out: Insight[] = [];
  const starts = extractCycleStarts(periods);
  const avgPeriod = info.periodLength;
  const avgCycle = info.cycleLength;

  // 1) Symptom × phase dominance.
  const matrix = buildSymptomPhaseMatrix(periods, dailies, avgPeriod, avgCycle);
  for (const symptom of matrix.symptoms.slice(0, 4)) {
    const row = matrix.counts[symptom];
    const total = sum(row);
    if (total < 3) continue; // need enough data
    let topPhase: Phase = 'menstrual';
    for (const p of PHASES) if (row[p] > row[topPhase]) topPhase = p;
    const share = Math.round((row[topPhase] / total) * 100);
    if (share >= 45) {
      out.push({
        id: `phase-${symptom}`,
        text: `You log ${symptom} most during your ${PHASE_NAMES[topPhase]} phase — about ${share}% of the time.`,
        tone: 'neutral',
      });
    }
  }

  // 2) Sleep ↔ symptom correlation.
  const sleepInsight = sleepSymptomInsight(dailies);
  if (sleepInsight) out.push(sleepInsight);

  // 3) Cycle length trend over recent months.
  const trend = cycleLengthTrend(starts);
  if (trend) out.push(trend);

  // 4) Period-length change.
  const plen = periodLengthTrend(periods, starts);
  if (plen) out.push(plen);

  // 5) Energy by phase (positive note).
  const energy = energyInsight(periods, dailies, avgPeriod, avgCycle);
  if (energy) out.push(energy);

  return out.slice(0, 6);
}

function sleepSymptomInsight(dailies: DailyLog[]): Insight | null {
  const withSleep = dailies.filter((d) => d.sleep_hours != null);
  if (withSleep.length < 8) return null;
  const short = withSleep.filter((d) => (d.sleep_hours as number) < 6);
  const rest = withSleep.filter((d) => (d.sleep_hours as number) >= 6);
  if (short.length < 3 || rest.length < 3) return null;

  // Find the symptom most over-represented on short-sleep days.
  const tally = (rows: DailyLog[]) => {
    const m = new Map<string, number>();
    for (const d of rows) for (const s of d.symptoms) m.set(s, (m.get(s) || 0) + 1);
    return m;
  };
  const shortRate = tally(short);
  const restRate = tally(rest);
  let best: { symptom: string; lift: number } | null = null;
  for (const [s, c] of shortRate) {
    const sr = c / short.length;
    const rr = (restRate.get(s) || 0) / rest.length;
    const lift = sr - rr;
    if (sr >= 0.4 && lift >= 0.2 && (!best || lift > best.lift)) best = { symptom: s, lift };
  }
  if (!best) return null;
  return {
    id: 'sleep-symptom',
    text: `Short sleep seems to bring on more ${best.symptom} — you log it far more often on nights under 6 hours.`,
    tone: 'watch',
  };
}

function cycleLengthTrend(starts: Date[]): Insight | null {
  const lens: number[] = [];
  for (let i = 1; i < starts.length; i++) {
    const l = differenceInDays(starts[i], starts[i - 1]);
    if (l >= 15 && l <= 60) lens.push(l);
  }
  if (lens.length < 6) return null;
  const recent = lens.slice(-3);
  const prior = lens.slice(-6, -3);
  const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
  const diff = Math.round(avg(recent) - avg(prior));
  if (diff >= 2) {
    return {
      id: 'cycle-longer',
      text: `Your cycle has been running about ${diff} days longer over the last few months than before.`,
      tone: 'watch',
    };
  }
  if (diff <= -2) {
    return {
      id: 'cycle-shorter',
      text: `Your cycle has been about ${Math.abs(diff)} days shorter recently than earlier in your history.`,
      tone: 'watch',
    };
  }
  return {
    id: 'cycle-steady',
    text: 'Your cycle length has been steady over the last several months — nicely predictable.',
    tone: 'positive',
  };
}

function periodLengthTrend(periods: PeriodLog[], starts: Date[]): Insight | null {
  if (starts.length < 4) return null;
  const logSet = new Set(periods.map((p) => p.date));
  const lengths = starts.map((start) => {
    let len = 1;
    let cursor = start;
    while (len <= 20) {
      const nd = addDays(cursor, 1);
      const key = `${nd.getFullYear()}-${String(nd.getMonth() + 1).padStart(2, '0')}-${String(nd.getDate()).padStart(2, '0')}`;
      if (!logSet.has(key)) break;
      len++;
      cursor = nd;
    }
    return len;
  });
  const recent = lengths.slice(-3);
  const avg = recent.reduce((s, x) => s + x, 0) / recent.length;
  if (avg >= 7) {
    return {
      id: 'period-long',
      text: `Your recent periods have averaged ${Math.round(avg)} days. Periods regularly over 7 days are worth mentioning to a clinician.`,
      tone: 'watch',
    };
  }
  return null;
}

function energyInsight(
  periods: PeriodLog[],
  dailies: DailyLog[],
  avgPeriod: number,
  avgCycle: number
): Insight | null {
  const starts = extractCycleStarts(periods);
  const byPhase: Record<Phase, number[]> = {
    menstrual: [],
    follicular: [],
    ovulation: [],
    luteal: [],
  };
  for (const d of dailies) {
    if (d.energy_level == null) continue;
    const phase = phaseForDate(d.date, starts, avgPeriod, avgCycle);
    if (phase) byPhase[phase].push(d.energy_level);
  }
  const avgs = PHASES.map((p) => ({
    p,
    n: byPhase[p].length,
    avg: byPhase[p].length ? byPhase[p].reduce((s, x) => s + x, 0) / byPhase[p].length : 0,
  })).filter((x) => x.n >= 3);
  if (avgs.length < 2) return null;
  const top = avgs.reduce((a, b) => (b.avg > a.avg ? b : a));
  if (top.avg >= 3.5) {
    return {
      id: 'energy-phase',
      text: `Your energy tends to peak in your ${PHASE_NAMES[top.p]} phase — a good window for the things that need momentum.`,
      tone: 'positive',
    };
  }
  return null;
}
