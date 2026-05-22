import { differenceInCalendarDays, parseISO, startOfDay } from 'date-fns';

/**
 * Count consecutive days (ending today or yesterday) that have at least one log.
 * Lenient on the most recent day so the streak doesn't "break" before you've
 * had a chance to check in today.
 */
export function computeStreak(dateKeys: string[], today: Date = new Date()): number {
  if (dateKeys.length === 0) return 0;
  const days = new Set(dateKeys);
  const t = startOfDay(today);

  // Anchor: today if logged, else yesterday if logged, else no active streak.
  let anchorOffset: number | null = null;
  const todayKey = isoKey(t, 0);
  const yKey = isoKey(t, -1);
  if (days.has(todayKey)) anchorOffset = 0;
  else if (days.has(yKey)) anchorOffset = -1;
  if (anchorOffset === null) return 0;

  let streak = 0;
  let offset = anchorOffset;
  while (days.has(isoKey(t, offset))) {
    streak++;
    offset--;
  }
  return streak;
}

function isoKey(base: Date, offsetDays: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + offsetDays);
  // local YYYY-MM-DD
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// kept for potential reuse / tests
export function daysBetween(a: string, b: string): number {
  return Math.abs(differenceInCalendarDays(parseISO(a), parseISO(b)));
}
