import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import { extractCycleStarts, type PeriodLog } from '@/lib/cycle';

export type Mucus = 'dry' | 'sticky' | 'creamy' | 'watery' | 'eggwhite';
export type LH = 'low' | 'high' | 'peak' | 'negative' | 'positive';
export type Cervix = 'low_firm_closed' | 'medium' | 'high_soft_open';
export type Goal = 'ttc' | 'avoid' | 'observe';

export type FertilityLog = {
  id: string;
  user_id: string;
  date: string;
  bbt_c: number | null;
  mucus: Mucus | null;
  lh: LH | null;
  intercourse: boolean;
  cervix: Cervix | null;
  notes: string | null;
};

export const MUCUS_FERTILITY: Record<Mucus, number> = {
  dry: 0,
  sticky: 1,
  creamy: 2,
  watery: 3,
  eggwhite: 4,
};

export const MUCUS_LABEL: Record<Mucus, string> = {
  dry: 'Dry',
  sticky: 'Sticky',
  creamy: 'Creamy',
  watery: 'Watery',
  eggwhite: 'Egg-white',
};

export const LH_LABEL: Record<LH, string> = {
  low: 'Low',
  high: 'High',
  peak: 'Peak',
  negative: 'Negative',
  positive: 'Positive',
};

export const CERVIX_LABEL: Record<Cervix, string> = {
  low_firm_closed: 'Low · firm · closed',
  medium: 'Medium',
  high_soft_open: 'High · soft · open',
};

export const C_TO_F = (c: number) => c * 1.8 + 32;
export const F_TO_C = (f: number) => (f - 32) / 1.8;

export type OvulationResult = {
  confirmed: boolean;
  ovulationDate: string | null; // best estimate (day before thermal shift / LH peak)
  method: 'bbt+signs' | 'lh' | 'mucus' | 'estimate' | 'none';
  coverlineC: number | null;
  thermalShiftDate: string | null;
};

/**
 * Detect ovulation within the CURRENT cycle using the sympto-thermal method:
 *  - BBT thermal shift: 3 consecutive temps above the "coverline" (max of the
 *    previous 6 lows + 0.1C), preceded by 6 lower temps.
 *  - LH peak/positive marks impending ovulation (~next day).
 *  - Mucus peak (last egg-white/watery day) approximates ovulation.
 * Confirmation requires the BBT rise (the only retrospective certainty).
 */
export function detectOvulation(
  cycleStart: Date,
  logs: FertilityLog[]
): OvulationResult {
  const inCycle = logs
    .filter((l) => parseISO(l.date) >= cycleStart)
    .sort((a, b) => a.date.localeCompare(b.date));

  // --- BBT thermal shift ---
  const temps = inCycle.filter((l) => l.bbt_c != null) as (FertilityLog & { bbt_c: number })[];
  let coverlineC: number | null = null;
  let thermalShiftDate: string | null = null;
  if (temps.length >= 9) {
    for (let i = 6; i <= temps.length - 3; i++) {
      const prior6 = temps.slice(i - 6, i).map((t) => t.bbt_c);
      const coverline = Math.max(...prior6) + 0.1;
      const next3 = temps.slice(i, i + 3);
      if (next3.every((t) => t.bbt_c >= coverline)) {
        coverlineC = Math.round(coverline * 100) / 100;
        thermalShiftDate = next3[0].date;
        break;
      }
    }
  }

  // --- LH peak ---
  const lhPeak = inCycle.find((l) => l.lh === 'peak' || l.lh === 'positive' || l.lh === 'high');

  // --- Mucus peak (last most-fertile day) ---
  const fertileMucus = inCycle.filter(
    (l) => l.mucus && MUCUS_FERTILITY[l.mucus] >= 3
  );
  const mucusPeak = fertileMucus.length ? fertileMucus[fertileMucus.length - 1] : null;

  if (thermalShiftDate) {
    // Ovulation is typically the day before the first high temp.
    const ov = format(addDays(parseISO(thermalShiftDate), -1), 'yyyy-MM-dd');
    return {
      confirmed: true,
      ovulationDate: ov,
      method: 'bbt+signs',
      coverlineC,
      thermalShiftDate,
    };
  }
  if (lhPeak) {
    return {
      confirmed: false,
      ovulationDate: format(addDays(parseISO(lhPeak.date), 1), 'yyyy-MM-dd'),
      method: 'lh',
      coverlineC,
      thermalShiftDate: null,
    };
  }
  if (mucusPeak) {
    return {
      confirmed: false,
      ovulationDate: mucusPeak.date,
      method: 'mucus',
      coverlineC,
      thermalShiftDate: null,
    };
  }
  return { confirmed: false, ovulationDate: null, method: 'none', coverlineC, thermalShiftDate: null };
}

export type DayProbability = {
  date: string;
  probability: number; // 0..1 conception probability if intercourse that day
};

/**
 * Per-day conception probability across a window, using a standard
 * fertile-window model relative to the estimated ovulation day. Peaks the day
 * before ovulation; ~0 outside the 6-day window.
 */
export function fertileProbabilities(ovulation: Date, from: Date, to: Date): DayProbability[] {
  // Relative-day probabilities (day 0 = ovulation). Based on widely-cited
  // sympto-thermal conception-probability curves.
  const curve: Record<number, number> = {
    [-5]: 0.1,
    [-4]: 0.16,
    [-3]: 0.24,
    [-2]: 0.3,
    [-1]: 0.33,
    [0]: 0.24,
    [1]: 0.08,
  };
  const out: DayProbability[] = [];
  let d = from;
  while (d <= to) {
    const rel = differenceInCalendarDays(d, ovulation);
    out.push({ date: format(d, 'yyyy-MM-dd'), probability: curve[rel] ?? 0 });
    d = addDays(d, 1);
  }
  return out;
}

export type FertilityWindow = {
  ovulation: Date | null;
  fertileStart: Date | null;
  fertileEnd: Date | null;
  peakDay: Date | null; // highest-probability day
  implantationStart: Date | null; // ~6 days post-ovulation
  implantationEnd: Date | null; // ~12 days post-ovulation
  confirmed: boolean;
  method: OvulationResult['method'];
};

/**
 * Resolve the cycle's fertile window. Prefers confirmed/observed ovulation
 * from signs; otherwise falls back to the calendar estimate (cycleLen - 14).
 */
export function resolveFertilityWindow(
  cycleStart: Date,
  cycleLength: number,
  logs: FertilityLog[]
): FertilityWindow {
  const detected = detectOvulation(cycleStart, logs);
  let ovulation: Date | null = detected.ovulationDate ? parseISO(detected.ovulationDate) : null;
  let method = detected.method;

  if (!ovulation) {
    ovulation = addDays(cycleStart, Math.max(7, cycleLength - 14));
    method = 'estimate';
  }

  return {
    ovulation,
    fertileStart: addDays(ovulation, -5),
    fertileEnd: addDays(ovulation, 1),
    peakDay: addDays(ovulation, -1),
    implantationStart: addDays(ovulation, 6),
    implantationEnd: addDays(ovulation, 12),
    confirmed: detected.confirmed,
    method,
  };
}

/** Whether a given date falls in the fertile window. */
export function isFertile(date: Date, w: FertilityWindow): boolean {
  if (!w.fertileStart || !w.fertileEnd) return false;
  return date >= w.fertileStart && date <= w.fertileEnd;
}

/** Current cycle start = latest period start on/before today. */
export function currentCycleStart(periods: PeriodLog[], today: Date = new Date()): Date | null {
  const starts = extractCycleStarts(periods);
  let cur: Date | null = null;
  for (const s of starts) if (s <= today) cur = s;
  return cur;
}
