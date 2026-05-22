'use client';

import { useEffect } from 'react';
import { reminderTick } from '@/lib/notifications';

/**
 * Runs while the app is open: checks once on mount, again when the tab
 * regains focus, and every minute. Foreground-only — true background push
 * would require a server with VAPID keys (see README).
 */
export function ReminderScheduler() {
  useEffect(() => {
    let active = true;
    const run = () => {
      if (active) void reminderTick();
    };
    run();
    const id = setInterval(run, 60_000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') run();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      active = false;
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
  return null;
}
