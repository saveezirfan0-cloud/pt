export type FetalWeek = {
  week: number;
  fruit: string; // size comparison
  emoji: string; // a gentle visual cue (fruit/veg)
  lengthCm: number | null; // crown-rump early, head-to-heel from ~wk20
  weightG: number | null;
  milestone: string; // what's developing this week
};

/**
 * Week-by-week development, weeks 4–40. Sizes are the familiar produce
 * comparisons used by mainstream pregnancy apps; lengths/weights are typical
 * averages (crown-rump length in early weeks, head-to-heel from ~week 20).
 * These are general averages, not medical advice — every pregnancy differs.
 */
export const FETAL_WEEKS: FetalWeek[] = [
  { week: 4, fruit: 'a poppy seed', emoji: '•', lengthCm: 0.1, weightG: null, milestone: 'The embryo implants and the placenta begins to form. Cells are organising into layers that will become every organ.' },
  { week: 5, fruit: 'an apple seed', emoji: '🍎', lengthCm: 0.2, weightG: null, milestone: 'The neural tube — the foundation of the brain and spinal cord — is forming, and the tiny heart begins to beat.' },
  { week: 6, fruit: 'a sweet pea', emoji: '🫛', lengthCm: 0.5, weightG: null, milestone: 'Facial features start to appear and the heart beats around 110 times a minute. Arm and leg buds emerge.' },
  { week: 7, fruit: 'a blueberry', emoji: '🫐', lengthCm: 1.0, weightG: null, milestone: 'The brain is growing fast and hand and foot paddles are forming. The umbilical cord is now working.' },
  { week: 8, fruit: 'a raspberry', emoji: '🫐', lengthCm: 1.6, weightG: 1, milestone: 'Fingers and toes are beginning to form and the baby starts making tiny movements, though you can\u2019t feel them yet.' },
  { week: 9, fruit: 'a cherry', emoji: '🍒', lengthCm: 2.3, weightG: 2, milestone: 'The basic body structure is in place. Tiny muscles are forming and the heart has divided into chambers.' },
  { week: 10, fruit: 'a strawberry', emoji: '🍓', lengthCm: 3.1, weightG: 4, milestone: 'Vital organs are formed and functioning. Tiny nails start to develop and the baby can bend its limbs.' },
  { week: 11, fruit: 'a lime', emoji: '🍈', lengthCm: 4.1, weightG: 7, milestone: 'The baby is now officially a fetus. Tooth buds appear and the fingers and toes separate.' },
  { week: 12, fruit: 'a plum', emoji: '🍑', lengthCm: 5.4, weightG: 14, milestone: 'Reflexes develop — the baby can curl its toes and clench its fists. The face looks distinctly human.' },
  { week: 13, fruit: 'a lemon', emoji: '🍋', lengthCm: 7.4, weightG: 23, milestone: 'Vocal cords form and the baby develops unique fingerprints. The first trimester ends this week.' },
  { week: 14, fruit: 'a peach', emoji: '🍑', lengthCm: 8.7, weightG: 43, milestone: 'The baby can make facial expressions and may start sucking its thumb. Fine hair (lanugo) begins to grow.' },
  { week: 15, fruit: 'an orange', emoji: '🍊', lengthCm: 10.1, weightG: 70, milestone: 'The baby can sense light and is moving amniotic fluid through its nose, practising for breathing.' },
  { week: 16, fruit: 'an avocado', emoji: '🥑', lengthCm: 11.6, weightG: 100, milestone: 'The eyes and ears are nearly in position. The baby\u2019s heart pumps around 25 litres of blood a day.' },
  { week: 17, fruit: 'a pear', emoji: '🍐', lengthCm: 13, weightG: 140, milestone: 'Fat stores begin to develop and the skeleton hardens from cartilage to bone.' },
  { week: 18, fruit: 'a bell pepper', emoji: '🫑', lengthCm: 14.2, weightG: 190, milestone: 'The baby can hear now — your voice and heartbeat are familiar sounds. Movements are getting stronger.' },
  { week: 19, fruit: 'a mango', emoji: '🥭', lengthCm: 15.3, weightG: 240, milestone: 'A protective coating called vernix covers the skin. You may start to feel the first flutters of movement.' },
  { week: 20, fruit: 'a banana', emoji: '🍌', lengthCm: 25.6, weightG: 300, milestone: 'Halfway there! The baby is swallowing and producing meconium. Now measured head-to-heel.' },
  { week: 21, fruit: 'a carrot', emoji: '🥕', lengthCm: 26.7, weightG: 360, milestone: 'The baby\u2019s movements become coordinated kicks and rolls you can really feel. Eyebrows are forming.' },
  { week: 22, fruit: 'a papaya', emoji: '🍈', lengthCm: 27.8, weightG: 430, milestone: 'The senses are sharpening — the baby can perceive touch and may respond to sounds from outside.' },
  { week: 23, fruit: 'a large mango', emoji: '🥭', lengthCm: 28.9, weightG: 501, milestone: 'Blood vessels in the lungs are developing to prepare for breathing. The baby has a regular sleep cycle.' },
  { week: 24, fruit: 'an ear of corn', emoji: '🌽', lengthCm: 30, weightG: 600, milestone: 'A milestone of viability. The inner ear is fully formed, giving the baby a sense of balance.' },
  { week: 25, fruit: 'a cauliflower', emoji: '🥦', lengthCm: 34.6, weightG: 660, milestone: 'The baby is putting on baby fat, growing hair, and its hands are now fully developed and active.' },
  { week: 26, fruit: 'a head of lettuce', emoji: '🥬', lengthCm: 35.6, weightG: 760, milestone: 'The eyes begin to open and the baby takes its first practice breaths of amniotic fluid.' },
  { week: 27, fruit: 'a bunch of broccoli', emoji: '🥦', lengthCm: 36.6, weightG: 875, milestone: 'Brain activity is increasing. The baby may hiccup — those rhythmic little jumps you feel. End of trimester two.' },
  { week: 28, fruit: 'an eggplant', emoji: '🍆', lengthCm: 37.6, weightG: 1000, milestone: 'The third trimester begins. The baby can blink, and dreams (REM sleep) are now possible.' },
  { week: 29, fruit: 'a butternut squash', emoji: '🎃', lengthCm: 38.6, weightG: 1150, milestone: 'Muscles and lungs continue to mature, and the head is growing to make room for the developing brain.' },
  { week: 30, fruit: 'a cabbage', emoji: '🥬', lengthCm: 39.9, weightG: 1300, milestone: 'The baby\u2019s eyesight continues developing and bone marrow takes over red blood cell production.' },
  { week: 31, fruit: 'a coconut', emoji: '🥥', lengthCm: 41.1, weightG: 1500, milestone: 'The baby can turn its head side to side, and all five senses are working.' },
  { week: 32, fruit: 'a large jicama', emoji: '🥔', lengthCm: 42.4, weightG: 1700, milestone: 'The baby is practising breathing and usually settles into a head-down position. Toenails are visible.' },
  { week: 33, fruit: 'a pineapple', emoji: '🍍', lengthCm: 43.7, weightG: 1900, milestone: 'The bones are hardening, though the skull stays soft and flexible for birth. The pupils respond to light.' },
  { week: 34, fruit: 'a cantaloupe', emoji: '🍈', lengthCm: 45, weightG: 2100, milestone: 'The central nervous system and lungs are maturing steadily. Vernix gets thicker to protect the skin.' },
  { week: 35, fruit: 'a honeydew melon', emoji: '🍈', lengthCm: 46.2, weightG: 2400, milestone: 'Most development is complete — now the baby is mainly gaining weight. The kidneys are fully developed.' },
  { week: 36, fruit: 'a large papaya', emoji: '🍈', lengthCm: 47.4, weightG: 2600, milestone: 'The baby is shedding much of its fine hair and vernix. It\u2019s getting snug in there as it keeps growing.' },
  { week: 37, fruit: 'a bunch of swiss chard', emoji: '🥬', lengthCm: 48.6, weightG: 2900, milestone: 'Considered early term. The baby is practising breathing, sucking and gripping for life outside.' },
  { week: 38, fruit: 'a leek', emoji: '🥬', lengthCm: 49.8, weightG: 3100, milestone: 'The brain and lungs continue fine-tuning. The baby has a firm grasp and organs are ready for birth.' },
  { week: 39, fruit: 'a small pumpkin', emoji: '🎃', lengthCm: 50.7, weightG: 3300, milestone: 'Full term. The baby is ready to meet you — building the last layer of protective fat.' },
  { week: 40, fruit: 'a small watermelon', emoji: '🍉', lengthCm: 51.2, weightG: 3400, milestone: 'Your due date! The baby is fully developed. Babies arrive on their own schedule — a little early or late is normal.' },
];

const FIRST = FETAL_WEEKS[0];
const LAST = FETAL_WEEKS[FETAL_WEEKS.length - 1];

export function fetalDataForWeek(week: number): FetalWeek {
  if (week <= FIRST.week) return FIRST;
  if (week >= LAST.week) return LAST;
  return FETAL_WEEKS.find((w) => w.week === week) ?? FIRST;
}

export const MIN_FETAL_WEEK = FIRST.week;
export const MAX_FETAL_WEEK = LAST.week;
