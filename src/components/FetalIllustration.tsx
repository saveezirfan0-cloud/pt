/**
 * Original, gentle, stylised illustrations of fetal development by stage.
 * These are non-graphic, theme-aware SVGs (not photographs or copyrighted
 * medical imagery) — a friendly visual companion to the size/weight data.
 */

type Stage = 'early_embryo' | 'embryo' | 'early_fetus' | 'mid_fetus' | 'late_fetus';

function stageForWeek(week: number): Stage {
  if (week <= 6) return 'early_embryo';
  if (week <= 10) return 'embryo';
  if (week <= 16) return 'early_fetus';
  if (week <= 27) return 'mid_fetus';
  return 'late_fetus';
}

const STAGE_CAPTION: Record<Stage, string> = {
  early_embryo: 'Early embryo — the neural tube and heart are forming.',
  embryo: 'Embryo — head, limb buds, and beating heart take shape.',
  early_fetus: 'Early fetus — recognisably human, fingers and toes formed.',
  mid_fetus: 'Fetus — growing fast, moving, with developing senses.',
  late_fetus: 'Fetus — putting on weight and preparing to meet you.',
};

export function FetalIllustration({ week }: { week: number }) {
  const stage = stageForWeek(week);
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-full max-w-[220px] aspect-square">
        <svg viewBox="0 0 200 200" className="h-full w-full" role="img" aria-label={STAGE_CAPTION[stage]}>
          <defs>
            <radialGradient id="womb" cx="50%" cy="45%" r="60%">
              <stop offset="0%" stopColor="rgb(var(--mauve-100))" />
              <stop offset="100%" stopColor="rgb(var(--rose-100))" />
            </radialGradient>
            <linearGradient id="body" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgb(var(--rose-300))" />
              <stop offset="100%" stopColor="rgb(var(--mauve-300))" />
            </linearGradient>
          </defs>

          {/* womb backdrop */}
          <circle cx="100" cy="100" r="92" fill="url(#womb)" />
          <circle cx="100" cy="100" r="92" fill="none" stroke="rgb(var(--mauve-200))" strokeWidth="2" />

          <Figure stage={stage} />
        </svg>
      </div>
      <p className="mt-3 text-sm text-ink-600 text-center leading-relaxed px-2">{STAGE_CAPTION[stage]}</p>
      <p className="mt-1 text-[11px] text-ink-400 text-center">Stylised illustration — every baby grows differently.</p>
    </div>
  );
}

function Figure({ stage }: { stage: Stage }) {
  const body = 'url(#body)';
  switch (stage) {
    case 'early_embryo':
      // a small curled comma shape
      return (
        <g>
          <path
            d="M104 70 C82 74 74 96 84 116 C90 128 104 130 110 120 C103 116 99 108 102 100 C105 92 112 90 116 94 C118 82 116 70 104 70 Z"
            fill={body}
          />
          <circle cx="108" cy="80" r="4" fill="rgb(var(--ink-700) / 0.35)" />
        </g>
      );
    case 'embryo':
      // larger head, curved back, tiny limb buds
      return (
        <g>
          <path
            d="M118 64 C96 60 78 74 76 96 C74 116 86 134 104 138 C118 141 128 132 124 120 C116 122 108 116 108 106 C108 96 116 90 124 92 C132 80 130 66 118 64 Z"
            fill={body}
          />
          <circle cx="116" cy="78" r="5" fill="rgb(var(--ink-700) / 0.35)" />
          {/* limb buds */}
          <circle cx="92" cy="120" r="5" fill={body} />
          <circle cx="112" cy="134" r="5" fill={body} />
        </g>
      );
    case 'early_fetus':
      // head + body + visible arms/legs
      return (
        <g>
          <circle cx="100" cy="74" r="22" fill={body} />
          <path d="M88 92 C84 110 86 132 100 140 C114 132 116 110 112 92 Z" fill={body} />
          {/* arms */}
          <path d="M90 98 C78 100 72 110 74 120" stroke={body} strokeWidth="7" fill="none" strokeLinecap="round" />
          <path d="M110 98 C122 100 128 110 126 120" stroke={body} strokeWidth="7" fill="none" strokeLinecap="round" />
          {/* legs */}
          <path d="M94 138 C90 150 90 158 94 164" stroke={body} strokeWidth="8" fill="none" strokeLinecap="round" />
          <path d="M106 138 C110 150 110 158 106 164" stroke={body} strokeWidth="8" fill="none" strokeLinecap="round" />
          <circle cx="94" cy="70" r="3" fill="rgb(var(--ink-700) / 0.3)" />
        </g>
      );
    case 'mid_fetus':
      // curled, fuller proportions
      return (
        <g>
          <circle cx="104" cy="70" r="24" fill={body} />
          <path d="M90 88 C80 108 82 136 104 146 C126 138 128 110 118 88 Z" fill={body} />
          <path d="M90 96 C76 102 70 116 76 128" stroke={body} strokeWidth="9" fill="none" strokeLinecap="round" />
          <path d="M118 96 C132 100 136 114 130 126" stroke={body} strokeWidth="9" fill="none" strokeLinecap="round" />
          <path d="M96 144 C90 156 92 166 100 170" stroke={body} strokeWidth="10" fill="none" strokeLinecap="round" />
          <path d="M110 144 C118 154 118 164 110 170" stroke={body} strokeWidth="10" fill="none" strokeLinecap="round" />
          <circle cx="96" cy="66" r="3.5" fill="rgb(var(--ink-700) / 0.3)" />
        </g>
      );
    case 'late_fetus':
    default:
      // fuller, curled in fetal position, filling the womb
      return (
        <g>
          <circle cx="106" cy="72" r="27" fill={body} />
          <path d="M88 92 C72 114 78 148 106 156 C134 148 136 112 122 90 Z" fill={body} />
          <path d="M88 104 C72 108 64 124 72 138" stroke={body} strokeWidth="11" fill="none" strokeLinecap="round" />
          <path d="M122 100 C138 104 144 120 136 134" stroke={body} strokeWidth="11" fill="none" strokeLinecap="round" />
          <path d="M96 152 C88 164 92 176 102 178" stroke={body} strokeWidth="12" fill="none" strokeLinecap="round" />
          <path d="M114 152 C124 162 124 174 114 178" stroke={body} strokeWidth="12" fill="none" strokeLinecap="round" />
          <circle cx="98" cy="68" r="3.5" fill="rgb(var(--ink-700) / 0.3)" />
        </g>
      );
  }
}
