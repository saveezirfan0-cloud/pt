import { addDays, differenceInCalendarDays, format, parseISO, startOfDay } from 'date-fns';

export type PregnancyMethod = 'lmp' | 'due_date' | 'conception';

export type Pregnancy = {
  id: string;
  user_id: string;
  lmp_date: string; // YYYY-MM-DD — effective week-0 anchor
  due_date: string; // YYYY-MM-DD
  method: PregnancyMethod;
  baby_name: string | null;
  status: 'active' | 'ended';
  end_date: string | null;
  end_reason: string | null;
};

export type PregnancyInfo = {
  week: number; // completed weeks (0..42)
  dayOfWeek: number; // 0..6 within current week
  trimester: 1 | 2 | 3;
  totalDays: number; // days since LMP (clamped >= 0)
  daysRemaining: number; // until due date (can be negative if overdue)
  progress: number; // 0..1 across 280 days
  dueDate: Date;
  lmp: Date;
  conceptionApprox: Date;
  isOverdue: boolean;
  label: string; // e.g. "Week 24 + 3 days"
};

const TERM_DAYS = 280; // 40 weeks

/** Derive the effective LMP (week 0) from any supported input method. */
export function deriveLmp(method: PregnancyMethod, dateISO: string): string {
  const d = parseISO(dateISO);
  if (method === 'lmp') return format(d, 'yyyy-MM-dd');
  if (method === 'due_date') return format(addDays(d, -TERM_DAYS), 'yyyy-MM-dd');
  // conception ≈ LMP + 14 days  →  LMP = conception - 14
  return format(addDays(d, -14), 'yyyy-MM-dd');
}

export function dueDateFromLmp(lmpISO: string): string {
  return format(addDays(parseISO(lmpISO), TERM_DAYS), 'yyyy-MM-dd');
}

export function trimesterFor(week: number): 1 | 2 | 3 {
  if (week < 13) return 1;
  if (week < 27) return 2;
  return 3;
}

export function computePregnancyInfo(p: Pregnancy, today: Date = new Date()): PregnancyInfo {
  const lmp = startOfDay(parseISO(p.lmp_date));
  const dueDate = startOfDay(parseISO(p.due_date));
  const t = startOfDay(today);

  const totalDays = Math.max(0, differenceInCalendarDays(t, lmp));
  const week = Math.min(42, Math.floor(totalDays / 7));
  const dayOfWeek = totalDays % 7;
  const daysRemaining = differenceInCalendarDays(dueDate, t);
  const progress = Math.max(0, Math.min(1, totalDays / TERM_DAYS));

  return {
    week,
    dayOfWeek,
    trimester: trimesterFor(week),
    totalDays,
    daysRemaining,
    progress,
    dueDate,
    lmp,
    conceptionApprox: addDays(lmp, 14),
    isOverdue: daysRemaining < 0,
    label: `Week ${week}${dayOfWeek ? ` + ${dayOfWeek} ${dayOfWeek === 1 ? 'day' : 'days'}` : ''}`,
  };
}

/** Friendly "X weeks, Y days to go" / overdue string. */
export function countdownText(info: PregnancyInfo): string {
  if (info.isOverdue) {
    const over = Math.abs(info.daysRemaining);
    return `${over} ${over === 1 ? 'day' : 'days'} overdue`;
  }
  if (info.daysRemaining === 0) return 'Due today';
  const w = Math.floor(info.daysRemaining / 7);
  const d = info.daysRemaining % 7;
  if (w === 0) return `${d} ${d === 1 ? 'day' : 'days'} to go`;
  if (d === 0) return `${w} ${w === 1 ? 'week' : 'weeks'} to go`;
  return `${w}w ${d}d to go`;
}
