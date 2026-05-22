import type { CycleInfo } from '@/lib/cycle';

type Phase = CycleInfo['phase'];

/**
 * Gentle, body-positive affirmations grouped by cycle phase.
 * Selection is deterministic per day so the message feels steady,
 * not random, across reloads.
 */
const AFFIRMATIONS: Record<Phase, string[]> = {
  menstrual: [
    'Rest is productive. Your body is doing quiet, important work.',
    'You are allowed to slow down. Softness is strength.',
    'Honour what your body asks for today — warmth, stillness, kindness.',
    'Shedding and renewing is its own kind of power.',
    'Be as gentle with yourself as you would be with a dear friend.',
  ],
  follicular: [
    'Fresh energy is rising. Follow the spark of curiosity.',
    'This is a beginning. Plant the seeds you want to grow.',
    'You feel open and capable today — lean into it.',
    'Momentum is on your side. One small brave step.',
    'New ideas love a rested mind. Yours is ready.',
  ],
  ovulation: [
    'You are radiant. Let yourself be seen.',
    'Confidence is your companion this week — say the thing.',
    'Connection feels easy now. Reach out to someone you love.',
    'You are at your most magnetic. Trust your voice.',
    'Bright, open, alive — savour this peak.',
  ],
  luteal: [
    'Winding down is wisdom, not weakness.',
    'Tend to yourself: warm food, soft light, early nights.',
    'Your sensitivity is a gift. Let feelings move through.',
    'Clear the noise. Protect your peace this week.',
    'Be patient with yourself — you are preparing to renew.',
  ],
  unknown: [
    'Every day you check in with yourself is a small act of love.',
    'Knowing your body is a journey, not a test.',
    'You showed up for yourself today. That matters.',
    'Be curious about your body, not critical of it.',
    'Small, steady care adds up to something beautiful.',
  ],
};

const SELF_CARE: Record<Phase, string[]> = {
  menstrual: ['warm bath', 'iron-rich meal', 'gentle stretching', 'extra sleep', 'a hot water bottle'],
  follicular: ['a new workout', 'brainstorming', 'a walk outside', 'tackling a goal', 'creative play'],
  ovulation: ['time with friends', 'a big conversation', 'dancing', 'saying yes', 'celebrating you'],
  luteal: ['magnesium-rich foods', 'journaling', 'a slow evening', 'less caffeine', 'comfort & calm'],
  unknown: ['a glass of water', 'five deep breaths', 'a short walk', 'a moment of stillness', 'a kind thought'],
};

function dayIndex(date: Date): number {
  // days since epoch — stable within a calendar day
  return Math.floor(date.getTime() / 86_400_000);
}

export function affirmationFor(phase: Phase, date: Date = new Date()): string {
  const list = AFFIRMATIONS[phase] ?? AFFIRMATIONS.unknown;
  return list[dayIndex(date) % list.length];
}

export function selfCareFor(phase: Phase, date: Date = new Date()): string {
  const list = SELF_CARE[phase] ?? SELF_CARE.unknown;
  return list[dayIndex(date) % list.length];
}
