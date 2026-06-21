'use client';

/**
 * Editable SVG promo-card templates (WB/Ozon-style). Rendered both in the admin
 * builder (live preview) and on the storefront. The config is stored as JSON on
 * the promotion (`templateJson`).
 *
 * The layout is ratio-aware: the SVG viewBox width follows the chosen ratio
 * (height fixed at 400) and content is centered/spread accordingly, so a promo
 * can be a square card OR a full-bleed wide banner with all content visible.
 * `preserveAspectRatio="meet"` guarantees nothing is ever cropped.
 */

export type PromoTemplateId = 'bold' | 'burst' | 'split' | 'minimal' | 'ribbon' | 'wave' | 'corner';
export type PromoColorId = 'red' | 'blue' | 'green' | 'amber' | 'purple' | 'teal' | 'dark';
export type PromoRatio = '1/1' | '4/3' | '3/1' | '16/6' | '16/5' | '21/9';

export interface PromoTemplateConfig {
  id: PromoTemplateId;
  color: PromoColorId;
  headline: string;
  title: string;
  subtitle?: string;
  footnote?: string;
  /** Aspect for the /promotions cards & detail (default square). */
  cardRatio?: PromoRatio;
  /** Aspect for the homepage banner (default wide 16:5). */
  bannerRatio?: PromoRatio;
}

export const PROMO_TEMPLATES: { id: PromoTemplateId; label: string }[] = [
  { id: 'bold', label: 'Bold' },
  { id: 'burst', label: 'Sticker' },
  { id: 'split', label: 'Split' },
  { id: 'minimal', label: 'Minimal' },
  { id: 'ribbon', label: 'Ribbon' },
  { id: 'wave', label: 'Wave' },
  { id: 'corner', label: 'Corner' },
];

/** Fixed height; width derived from the ratio. */
const RATIO_H = 400;
export const PROMO_RATIO_DIMS: Record<PromoRatio, { w: number; h: number }> = {
  '1/1': { w: 400, h: RATIO_H },
  '4/3': { w: 533, h: RATIO_H },
  '16/6': { w: 1067, h: RATIO_H },
  '16/5': { w: 1280, h: RATIO_H },
  '3/1': { w: 1200, h: RATIO_H },
  '21/9': { w: 933, h: RATIO_H },
};

export const PROMO_RATIO_CLASS: Record<PromoRatio, string> = {
  '1/1': 'aspect-square',
  '4/3': 'aspect-[4/3]',
  '16/6': 'aspect-[16/6]',
  '16/5': 'aspect-[16/5]',
  '3/1': 'aspect-[3/1]',
  '21/9': 'aspect-[21/9]',
};

export const PROMO_RATIOS: { value: PromoRatio; label: string }[] = [
  { value: '1/1', label: '1:1' },
  { value: '4/3', label: '4:3' },
  { value: '16/6', label: '16:6' },
  { value: '16/5', label: '16:5' },
  { value: '3/1', label: '3:1' },
  { value: '21/9', label: '21:9' },
];

interface Palette { from: string; to: string; accent: string; text: string; soft: string }

export const PROMO_COLORS: Record<PromoColorId, Palette> = {
  red: { from: '#F43F5E', to: '#881337', accent: '#FACC15', text: '#FFFFFF', soft: 'rgba(255,255,255,0.82)' },
  blue: { from: '#3B82F6', to: '#0B2C66', accent: '#FACC15', text: '#FFFFFF', soft: 'rgba(255,255,255,0.82)' },
  green: { from: '#10B981', to: '#064E3B', accent: '#FFFFFF', text: '#FFFFFF', soft: 'rgba(255,255,255,0.82)' },
  amber: { from: '#F59E0B', to: '#7C2D12', accent: '#FFFFFF', text: '#FFFFFF', soft: 'rgba(255,255,255,0.85)' },
  purple: { from: '#8B5CF6', to: '#3B0764', accent: '#FBBF24', text: '#FFFFFF', soft: 'rgba(255,255,255,0.82)' },
  teal: { from: '#14B8A6', to: '#0F3D3A', accent: '#FBBF24', text: '#FFFFFF', soft: 'rgba(255,255,255,0.82)' },
  dark: { from: '#334155', to: '#0B1220', accent: '#3B82F6', text: '#FFFFFF', soft: 'rgba(255,255,255,0.7)' },
};

export const PROMO_COLOR_LIST: PromoColorId[] = ['red', 'blue', 'green', 'amber', 'purple', 'teal', 'dark'];

export const defaultPromoConfig = (): PromoTemplateConfig => ({
  id: 'bold',
  color: 'red',
  headline: '-30%',
  title: 'Ակցիա',
  subtitle: '',
  footnote: '',
  cardRatio: '1/1',
  bannerRatio: '16/5',
});

const RATIO_SET = new Set<PromoRatio>(['1/1', '4/3', '3/1', '16/6', '16/5', '21/9']);

export function parsePromoConfig(json: string | undefined | null): PromoTemplateConfig | null {
  if (!json) return null;
  try {
    const c = JSON.parse(json) as Partial<PromoTemplateConfig>;
    if (!c || typeof c !== 'object' || !c.id || !c.color) return null;
    return {
      id: c.id, color: c.color, headline: c.headline ?? '', title: c.title ?? '',
      subtitle: c.subtitle ?? '', footnote: c.footnote ?? '',
      cardRatio: c.cardRatio && RATIO_SET.has(c.cardRatio) ? c.cardRatio : '1/1',
      bannerRatio: c.bannerRatio && RATIO_SET.has(c.bannerRatio) ? c.bannerRatio : '16/5',
    };
  } catch { return null; }
}

/** Wrap text into up to `maxLines` lines of ≈`max` chars (word-aware). */
function wrap(text: string, max: number, maxLines: number): string[] {
  const words = (text ?? '').trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length <= max) cur = (cur + ' ' + w).trim();
    else { if (cur) lines.push(cur); cur = w; }
    if (lines.length >= maxLines) break;
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, '') + '…';
  }
  return lines.length ? lines : [''];
}

export function PromoTemplate({ config, className, ratio }: { config: PromoTemplateConfig; className?: string; ratio?: PromoRatio }) {
  const c = PROMO_COLORS[config.color] ?? PROMO_COLORS.red;
  const effRatio: PromoRatio = ratio ?? config.cardRatio ?? '1/1';
  const { w: W, h: H } = PROMO_RATIO_DIMS[effRatio] ?? PROMO_RATIO_DIMS['1/1'];
  const CX = W / 2;
  const gid = `pg-${config.id}-${config.color}-${effRatio}`;
  // Allow more characters per line as the canvas gets wider.
  const titleLines = wrap(config.title, Math.round(18 * (W / 400)), 2);

  const Bg = (
    <>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2={W} y2={H} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={c.from} />
          <stop offset="1" stopColor={c.to} />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#${gid})`} />
    </>
  );

  const common = {
    width: '100%', height: '100%', viewBox: `0 0 ${W} ${H}`,
    preserveAspectRatio: 'xMidYMid meet', xmlns: 'http://www.w3.org/2000/svg',
    style: { fontFamily: 'var(--font-sans, system-ui, sans-serif)', display: 'block' as const, width: '100%', height: '100%' },
    className,
  };

  if (config.id === 'minimal') {
    return (
      <svg {...common}>
        {Bg}
        <rect x="40" y="150" width="6" height="100" rx="3" fill={c.accent} />
        <text x="62" y="180" fontSize="64" fontWeight="800" fill={c.accent}>{config.headline}</text>
        {titleLines.map((l, i) => (
          <text key={i} x="62" y={232 + i * 30} fontSize="26" fontWeight="700" fill={c.text}>{l}</text>
        ))}
        {config.subtitle ? <text x="62" y={300} fontSize="18" fill={c.soft}>{config.subtitle}</text> : null}
        {config.footnote ? <text x="62" y={350} fontSize="16" fontWeight="600" fill={c.accent}>{config.footnote}</text> : null}
      </svg>
    );
  }

  if (config.id === 'split') {
    return (
      <svg {...common}>
        {Bg}
        <polygon points={`0,0 ${W},0 ${W},150 0,250`} fill="#000" opacity="0.18" />
        <text x={CX} y="135" textAnchor="middle" fontSize="92" fontWeight="900" fill={c.accent}>{config.headline}</text>
        {titleLines.map((l, i) => (
          <text key={i} x={CX} y={250 + i * 32} textAnchor="middle" fontSize="28" fontWeight="700" fill={c.text}>{l}</text>
        ))}
        {config.subtitle ? <text x={CX} y={322} textAnchor="middle" fontSize="18" fill={c.soft}>{config.subtitle}</text> : null}
        {config.footnote ? <text x={CX} y={364} textAnchor="middle" fontSize="16" fontWeight="700" fill={c.accent}>{config.footnote}</text> : null}
      </svg>
    );
  }

  if (config.id === 'burst') {
    return (
      <svg {...common}>
        {Bg}
        <circle cx={CX} cy="160" r="118" fill="#FFFFFF" opacity="0.1" />
        <circle cx={CX} cy="160" r="96" fill={c.accent} />
        <text x={CX} y="178" textAnchor="middle" fontSize="58" fontWeight="900" fill={c.to}>{config.headline}</text>
        {titleLines.map((l, i) => (
          <text key={i} x={CX} y={306 + i * 30} textAnchor="middle" fontSize="26" fontWeight="800" fill={c.text}>{l}</text>
        ))}
        {config.subtitle ? <text x={CX} y={368} textAnchor="middle" fontSize="17" fill={c.soft}>{config.subtitle}</text> : null}
      </svg>
    );
  }

  if (config.id === 'ribbon') {
    return (
      <svg {...common}>
        {Bg}
        <polygon points="0,70 230,70 200,130 0,130" fill={c.accent} />
        <text x="24" y="112" fontSize="34" fontWeight="900" fill={c.to}>{config.headline}</text>
        {titleLines.map((l, i) => (
          <text key={i} x={CX} y={250 + i * 32} textAnchor="middle" fontSize="30" fontWeight="800" fill={c.text}>{l}</text>
        ))}
        {config.subtitle ? <text x={CX} y={326} textAnchor="middle" fontSize="18" fill={c.soft}>{config.subtitle}</text> : null}
        {config.footnote ? <text x={CX} y={368} textAnchor="middle" fontSize="16" fontWeight="700" fill={c.accent}>{config.footnote}</text> : null}
      </svg>
    );
  }

  if (config.id === 'wave') {
    return (
      <svg {...common}>
        {Bg}
        {/* Layered waves rising from the bottom (accent) */}
        <path d={`M0,300 Q ${W * 0.25},258 ${W * 0.5},300 T ${W},300 L ${W},${H} L 0,${H} Z`} fill={c.accent} opacity="0.18" />
        <path d={`M0,338 Q ${W * 0.25},300 ${W * 0.5},338 T ${W},338 L ${W},${H} L 0,${H} Z`} fill={c.accent} opacity="0.30" />
        <text x={CX} y="150" textAnchor="middle" fontSize="92" fontWeight="900" fill={c.accent}>{config.headline}</text>
        {titleLines.map((l, i) => (
          <text key={i} x={CX} y={216 + i * 32} textAnchor="middle" fontSize="30" fontWeight="700" fill={c.text}>{l}</text>
        ))}
        {config.subtitle ? <text x={CX} y={288} textAnchor="middle" fontSize="18" fill={c.soft}>{config.subtitle}</text> : null}
        {config.footnote ? <text x={CX} y={356} textAnchor="middle" fontSize="16" fontWeight="700" fill={c.text}>{config.footnote}</text> : null}
      </svg>
    );
  }

  if (config.id === 'corner') {
    return (
      <svg {...common}>
        {Bg}
        {/* Diagonal corner ribbon (top-right) + small accent dot */}
        <polygon points={`${W - 220},0 ${W},0 ${W},220`} fill={c.accent} opacity="0.92" />
        <circle cx="58" cy="78" r="9" fill={c.accent} opacity="0.6" />
        <text x="56" y="188" fontSize="84" fontWeight="900" fill={c.accent}>{config.headline}</text>
        {titleLines.map((l, i) => (
          <text key={i} x="58" y={248 + i * 32} fontSize="30" fontWeight="800" fill={c.text}>{l}</text>
        ))}
        {config.subtitle ? <text x="58" y={320} fontSize="18" fill={c.soft}>{config.subtitle}</text> : null}
        {config.footnote ? <text x="58" y={362} fontSize="16" fontWeight="700" fill={c.accent}>{config.footnote}</text> : null}
      </svg>
    );
  }

  // 'bold' (default)
  return (
    <svg {...common}>
      {Bg}
      <circle cx={W - 60} cy="64" r="120" fill={c.accent} opacity="0.14" />
      <circle cx="56" cy="360" r="90" fill="#FFFFFF" opacity="0.06" />
      <text x={CX} y="178" textAnchor="middle" fontSize="108" fontWeight="900" fill={c.accent}>{config.headline}</text>
      {titleLines.map((l, i) => (
        <text key={i} x={CX} y={246 + i * 32} textAnchor="middle" fontSize="30" fontWeight="700" fill={c.text}>{l}</text>
      ))}
      {config.subtitle ? <text x={CX} y={318} textAnchor="middle" fontSize="19" fill={c.soft}>{config.subtitle}</text> : null}
      {config.footnote ? <text x={CX} y={364} textAnchor="middle" fontSize="16" fontWeight="700" fill={c.accent}>{config.footnote}</text> : null}
    </svg>
  );
}
