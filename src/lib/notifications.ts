'use client';

export type ReminderPrefs = {
  enabled: boolean;
  dailyTime: string; // "HH:MM" 24h
  periodAlerts: boolean;
};

const PREFS_KEY = 'luna-reminders';
const NEXT_PERIOD_KEY = 'luna-next-period';
const LAST_DAILY_KEY = 'luna-notif-daily';
const LAST_PERIOD_KEY = 'luna-notif-period';

export const DEFAULT_PREFS: ReminderPrefs = {
  enabled: false,
  dailyTime: '20:00',
  periodAlerts: true,
};

export function supportsNotifications(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function permission(): NotificationPermission | 'unsupported' {
  if (!supportsNotifications()) return 'unsupported';
  return Notification.permission;
}

export function getPrefs(): ReminderPrefs {
  if (typeof window === 'undefined') return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<ReminderPrefs>) };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function setPrefs(p: ReminderPrefs) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(p));
}

export function setNextPeriod(iso: string | null) {
  if (typeof window === 'undefined') return;
  if (iso) localStorage.setItem(NEXT_PERIOD_KEY, iso);
  else localStorage.removeItem(NEXT_PERIOD_KEY);
}

export function getNextPeriod(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(NEXT_PERIOD_KEY);
}

export async function requestPermission(): Promise<NotificationPermission> {
  if (!supportsNotifications()) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  return Notification.requestPermission();
}

export async function showNotification(title: string, body: string) {
  if (!supportsNotifications() || Notification.permission !== 'granted') return;
  const opts: NotificationOptions = { body, icon: '/icons/icon-192.png', badge: '/favicon.png' };
  try {
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null;
    if (reg) await reg.showNotification(title, opts);
    else new Notification(title, opts);
  } catch {
    try {
      new Notification(title, opts);
    } catch {
      /* ignore */
    }
  }
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Foreground tick — call periodically while the app is open.
 * Fires at most one daily reminder and one period reminder per calendar day.
 */
export async function reminderTick() {
  const prefs = getPrefs();
  if (!prefs.enabled || permission() !== 'granted') return;

  const now = new Date();
  const tk = todayKey();

  // Daily check-in reminder once the chosen time has passed.
  const [h, m] = prefs.dailyTime.split(':').map(Number);
  const due = new Date();
  due.setHours(h || 20, m || 0, 0, 0);
  if (now >= due && localStorage.getItem(LAST_DAILY_KEY) !== tk) {
    localStorage.setItem(LAST_DAILY_KEY, tk);
    await showNotification('A gentle check-in 🌙', 'How are you feeling today? Tap to log your day.');
  }

  // Upcoming-period reminder at 2, 1, and 0 days out.
  if (prefs.periodAlerts) {
    const next = getNextPeriod();
    if (next && localStorage.getItem(LAST_PERIOD_KEY) !== tk) {
      const days = daysUntil(next);
      if (days === 2) {
        localStorage.setItem(LAST_PERIOD_KEY, tk);
        await showNotification('Your period is near 🌸', 'It may start in about 2 days — a good time to prepare.');
      } else if (days === 1) {
        localStorage.setItem(LAST_PERIOD_KEY, tk);
        await showNotification('Your period is near 🌸', 'It may start tomorrow. Be gentle with yourself.');
      } else if (days === 0) {
        localStorage.setItem(LAST_PERIOD_KEY, tk);
        await showNotification('Period likely today 🌷', 'Listen to your body and rest if you need to.');
      }
    }
  }
}

function daysUntil(iso: string): number {
  const [y, mo, d] = iso.split('-').map(Number);
  const target = new Date(y, (mo || 1) - 1, d || 1);
  const today = new Date();
  target.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}
