'use client';

import { useEffect } from 'react';
import { setNextPeriod } from '@/lib/notifications';

/** Persists the predicted next-period date so reminders can use it offline. */
export function PredictionSync({ nextPeriodISO }: { nextPeriodISO: string | null }) {
  useEffect(() => {
    setNextPeriod(nextPeriodISO);
  }, [nextPeriodISO]);
  return null;
}
