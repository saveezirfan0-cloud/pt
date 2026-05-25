import type { CycleInfo } from '@/lib/cycle';
import type { PregnancyInfo } from '@/lib/pregnancy';

export type SupportGuidance = {
  phaseTitle: string;
  whatsHappening: string;
  howToHelp: string[];
  headsUp: string | null; // upcoming heads-up (e.g. PMS, period soon)
};

/**
 * Translate a partner's cycle phase into supportive, practical guidance for
 * the person supporting them. Warm and concrete, never clinical or presumptuous.
 */
export function cycleGuidance(info: CycleInfo): SupportGuidance {
  const daysToPeriod = info.daysUntilNext;
  const pmsSoon =
    daysToPeriod != null && daysToPeriod >= 0 && daysToPeriod <= 4 && info.phase === 'luteal';
  const periodHeadsUp = pmsSoon
    ? daysToPeriod === 0
      ? 'Her period may start today.'
      : `Her period is likely in about ${daysToPeriod} day${daysToPeriod === 1 ? '' : 's'}.`
    : null;

  switch (info.phase) {
    case 'menstrual':
      return {
        phaseTitle: 'Her period',
        whatsHappening:
          'She may have lower energy and cramps right now. Hormones are at their lowest, so rest and comfort go a long way.',
        howToHelp: [
          'Offer warmth — a hot water bottle, a blanket, a warm drink.',
          'Take something off her plate without being asked.',
          'Keep plans low-key; let her opt out of anything draining.',
          'Comfort food and pain relief on hand are quietly appreciated.',
        ],
        headsUp: null,
      };
    case 'follicular':
      return {
        phaseTitle: 'Rising energy',
        whatsHappening:
          'Energy and mood are climbing as hormones rise. This is often a sociable, motivated, optimistic stretch.',
        howToHelp: [
          'A good time to plan dates, trips, or anything new together.',
          'Match her momentum — say yes to plans and ideas.',
          'Encourage the projects she\u2019s excited about.',
        ],
        headsUp: null,
      };
    case 'ovulation':
      return {
        phaseTitle: 'Peak window',
        whatsHappening:
          'Energy, confidence, and sociability tend to peak around now. She may feel her best and most outgoing.',
        howToHelp: [
          'Great time for quality time and meaningful conversation.',
          'Be present and engaged — she\u2019s likely feeling connected.',
          'Plan the social things you\u2019ve both been meaning to do.',
        ],
        headsUp: 'A calmer, more sensitive stretch usually follows in the next week or two.',
      };
    case 'luteal':
      return {
        phaseTitle: 'Winding down',
        whatsHappening:
          'After ovulation, energy gradually dips and sensitivity can rise. Some people feel premenstrual symptoms toward the end.',
        howToHelp: [
          'Be extra patient and gentle — small irritations can feel bigger now.',
          'Don\u2019t take mood shifts personally; they often pass with her period.',
          'Help keep things calm: lighter schedules, early nights, comfort food.',
          'Check in with a simple \u201chow are you feeling?\u201d',
        ],
        headsUp: periodHeadsUp,
      };
    default:
      return {
        phaseTitle: 'Getting started',
        whatsHappening:
          'Once she logs a cycle or two, you\u2019ll see where she is and how best to support her here.',
        howToHelp: ['Check in regularly and be there for her.'],
        headsUp: null,
      };
  }
}

export function pregnancySupport(info: PregnancyInfo): { title: string; tips: string[] } {
  if (info.trimester === 1) {
    return {
      title: 'First trimester',
      tips: [
        'Nausea and fatigue are common now — patience and rest help most.',
        'Take on cooking if smells are tough for her.',
        'Go to early appointments together if you can.',
      ],
    };
  }
  if (info.trimester === 2) {
    return {
      title: 'Second trimester',
      tips: [
        'Energy often returns — a good window for a babymoon or prep.',
        'Start planning the nursery and bigger to-dos together.',
        'You may be able to feel the baby kick soon — ask her.',
      ],
    };
  }
  return {
    title: 'Third trimester',
    tips: [
      'She\u2019s carrying a lot — help with anything physical and tiring.',
      'Pack the hospital bag together and finalise the birth plan.',
      'Learn the signs of labour and keep your phone on.',
    ],
  };
}
