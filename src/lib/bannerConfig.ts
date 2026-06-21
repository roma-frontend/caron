/**
 * Homepage banner design module — shared between the admin editor (/settings)
 * and the renderer (HomeBanners). Stored on settings.homeBannerConfig as a JSON
 * string so the whole look is editable without schema churn.
 */

export type BannerTemplate = 'cover' | 'cinematic' | 'spotlight' | 'split' | 'contain';
export type BannerRatio = '21/9' | '16/5' | '16/6' | '3/1' | '4/3';

export interface BannerConfig {
  /** Visual template. */
  template: BannerTemplate;
  /** Frame aspect ratio (controls height across the full width). */
  ratio: BannerRatio;
  /** Auto-rotate interval in seconds (0 = no autoplay). */
  autoplay: number;
  /** Rounded frame corners. */
  rounded: boolean;
  /** Show the promo title / description / discount overlay text. */
  overlay: boolean;
  /** Slow Ken-Burns zoom on full-bleed templates. */
  kenBurns: boolean;
  /** Accent color (hex) for the split panel, badges and progress. */
  accent: string;
}

export const DEFAULT_BANNER_CONFIG: BannerConfig = {
  template: 'cover',
  ratio: '16/5',
  autoplay: 5,
  rounded: true,
  overlay: true,
  kenBurns: true,
  accent: '#0066ae',
};

/** Tailwind aspect classes — kept as literals so JIT picks them up. */
export const BANNER_RATIO_CLASS: Record<BannerRatio, string> = {
  '21/9': 'aspect-[21/9]',
  '16/5': 'aspect-[16/5]',
  '16/6': 'aspect-[16/6]',
  '3/1': 'aspect-[3/1]',
  '4/3': 'aspect-[4/3]',
};

export const BANNER_TEMPLATES: { value: BannerTemplate; label: string; hint: string }[] = [
  { value: 'cover', label: 'Full-bleed', hint: 'Նկարը՝ 100% լայնք/բարձրություն' },
  { value: 'cinematic', label: 'Cinematic', hint: 'Մթ. վինետ + կենտրոնական տեքստ' },
  { value: 'spotlight', label: 'Spotlight', hint: 'Կուրսորին հետևող լույս' },
  { value: 'split', label: 'Split', hint: 'Նկար + գունավոր վահանակ' },
  { value: 'contain', label: 'Contain', hint: 'Ամբողջ նկարը՝ առանց կտրման' },
];

export const BANNER_RATIOS: { value: BannerRatio; label: string }[] = [
  { value: '21/9', label: '21:9' },
  { value: '16/5', label: '16:5' },
  { value: '16/6', label: '16:6' },
  { value: '3/1', label: '3:1' },
  { value: '4/3', label: '4:3' },
];

const TEMPLATE_SET = new Set<BannerTemplate>(['cover', 'cinematic', 'spotlight', 'split', 'contain']);
const RATIO_SET = new Set<BannerRatio>(['21/9', '16/5', '16/6', '3/1', '4/3']);
const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** Parse the stored JSON (or object) into a complete, validated config. */
export function parseBannerConfig(raw: unknown): BannerConfig {
  let obj: Record<string, unknown> = {};
  if (typeof raw === 'string' && raw.trim()) {
    try { obj = JSON.parse(raw) as Record<string, unknown>; } catch { obj = {}; }
  } else if (raw && typeof raw === 'object') {
    obj = raw as Record<string, unknown>;
  }

  const template = TEMPLATE_SET.has(obj.template as BannerTemplate)
    ? (obj.template as BannerTemplate)
    : DEFAULT_BANNER_CONFIG.template;
  const ratio = RATIO_SET.has(obj.ratio as BannerRatio)
    ? (obj.ratio as BannerRatio)
    : DEFAULT_BANNER_CONFIG.ratio;
  const autoplayNum = Number(obj.autoplay);
  const autoplay = Number.isFinite(autoplayNum) ? Math.max(0, Math.min(30, autoplayNum)) : DEFAULT_BANNER_CONFIG.autoplay;
  const accent = typeof obj.accent === 'string' && HEX_RE.test(obj.accent) ? obj.accent : DEFAULT_BANNER_CONFIG.accent;

  return {
    template,
    ratio,
    autoplay,
    rounded: obj.rounded !== false,
    overlay: obj.overlay !== false,
    kenBurns: obj.kenBurns !== false,
    accent,
  };
}
