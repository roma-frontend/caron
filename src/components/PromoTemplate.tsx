'use client';

/**
 * Editable SVG promo-card templates (WB/Ozon-style). Rendered both in the admin
 * builder (live preview) and on the storefront. The config is stored as JSON on
 * the promotion (`templateJson`).
 */

export type PromoTemplateId = 'bold' | 'burst' | 'split' | 'minimal' | 'ribbon';
export type PromoColorId = 'red' | 'blue' | 'green' | 'amber' | 'purple' | 'teal' | 'dark';

export interface PromoTemplateConfig {
  id: PromoTemplateId;
  color: PromoColorId;
  headline: string;
  title: string;
  subtitle?: string;
  footnote?: string;
}

export const PROMO_TEMPLATES: { id: PromoTemplateId; label: string }[] = [
  { id: 'bold', label: 'Bold' },
  { id: 'burst', label: 'Sticker' },
  { id: 'split', label: 'Split' },
  { id: 'minimal', label: 'Minimal' },
  { id: 'ribbon', label: 'Ribbon' },
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
});

export function parsePromoConfig(json: string | undefined | null): PromoTemplateConfig | null {
  if (!json) return null;
  try {
    const c = JSON.parse(json) as Partial<PromoTemplateConfig>;
    if (!c || typeof c !== 'object' || !c.id || !c.color) return null;
    return {
      id: c.id, color: c.color, headline: c.headline ?? '', title: c.title ?? '',
      subtitle: c.subtitle ?? '', footnote: c.footnote ?? '',
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

export function PromoTemplate({ config, className }: { config: PromoTemplateConfig; className?: string }) {
  const c = PROMO_COLORS[config.color] ?? PROMO_COLORS.red;
  const gid = `pg-${config.id}-${config.color}`;
  const titleLines = wrap(config.title, 18, 2);

  const Bg = (
    <>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="400" y2="400" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={c.from} />
          <stop offset="1" stopColor={c.to} />
        </linearGradient>
      </defs>
      <rect width="400" height="400" fill={`url(#${gid})`} />
    </>
  );

  const common = {
    width: '100%', height: '100%', viewBox: '0 0 400 400',
    preserveAspectRatio: 'xMidYMid slice', xmlns: 'http://www.w3.org/2000/svg',
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
        <polygon points="0,0 400,0 400,150 0,250" fill="#000" opacity="0.18" />
        <text x="200" y="135" textAnchor="middle" fontSize="92" fontWeight="900" fill={c.accent}>{config.headline}</text>
        {titleLines.map((l, i) => (
          <text key={i} x="200" y={250 + i * 32} textAnchor="middle" fontSize="28" fontWeight="700" fill={c.text}>{l}</text>
        ))}
        {config.subtitle ? <text x="200" y={322} textAnchor="middle" fontSize="18" fill={c.soft}>{config.subtitle}</text> : null}
        {config.footnote ? <text x="200" y={364} textAnchor="middle" fontSize="16" fontWeight="700" fill={c.accent}>{config.footnote}</text> : null}
      </svg>
    );
  }

  if (config.id === 'burst') {
    return (
      <svg {...common}>
        {Bg}
        <circle cx="200" cy="160" r="118" fill="#FFFFFF" opacity="0.1" />
        <circle cx="200" cy="160" r="96" fill={c.accent} />
        <text x="200" y="178" textAnchor="middle" fontSize="58" fontWeight="900" fill={c.to}>{config.headline}</text>
        {titleLines.map((l, i) => (
          <text key={i} x="200" y={306 + i * 30} textAnchor="middle" fontSize="26" fontWeight="800" fill={c.text}>{l}</text>
        ))}
        {config.subtitle ? <text x="200" y={368} textAnchor="middle" fontSize="17" fill={c.soft}>{config.subtitle}</text> : null}
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
          <text key={i} x="200" y={250 + i * 32} textAnchor="middle" fontSize="30" fontWeight="800" fill={c.text}>{l}</text>
        ))}
        {config.subtitle ? <text x="200" y={326} textAnchor="middle" fontSize="18" fill={c.soft}>{config.subtitle}</text> : null}
        {config.footnote ? <text x="200" y={368} textAnchor="middle" fontSize="16" fontWeight="700" fill={c.accent}>{config.footnote}</text> : null}
      </svg>
    );
  }

  // 'bold' (default)
  return (
    <svg {...common}>
      {Bg}
      <circle cx="340" cy="64" r="120" fill={c.accent} opacity="0.14" />
      <circle cx="56" cy="360" r="90" fill="#FFFFFF" opacity="0.06" />
      <text x="200" y="178" textAnchor="middle" fontSize="108" fontWeight="900" fill={c.accent}>{config.headline}</text>
      {titleLines.map((l, i) => (
        <text key={i} x="200" y={246 + i * 32} textAnchor="middle" fontSize="30" fontWeight="700" fill={c.text}>{l}</text>
      ))}
      {config.subtitle ? <text x="200" y={318} textAnchor="middle" fontSize="19" fill={c.soft}>{config.subtitle}</text> : null}
      {config.footnote ? <text x="200" y={364} textAnchor="middle" fontSize="16" fontWeight="700" fill={c.accent}>{config.footnote}</text> : null}
    </svg>
  );
}
