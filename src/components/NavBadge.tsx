'use client';


const VARIANTS = {
  hot: {
    bg: 'bg-gradient-to-r from-rose-500 to-orange-500',
    shadow: 'shadow-rose-500/30',
  },
  new: {
    bg: 'bg-gradient-to-r from-emerald-500 to-teal-500',
    shadow: 'shadow-emerald-500/30',
  },
  sale: {
    bg: 'bg-gradient-to-r from-red-600 to-rose-500',
    shadow: 'shadow-red-500/30',
  },
  boom: {
    bg: 'bg-gradient-to-r from-amber-400 to-yellow-500',
    shadow: 'shadow-amber-400/30',
  },
  trending: {
    bg: 'bg-gradient-to-r from-violet-500 to-purple-600',
    shadow: 'shadow-violet-500/30',
  },
  popular: {
    bg: 'bg-gradient-to-r from-sky-500 to-blue-600',
    shadow: 'shadow-sky-500/30',
  },
  best: {
    bg: 'bg-gradient-to-r from-amber-500 to-orange-400',
    shadow: 'shadow-amber-500/30',
  },
} as const;

const ANIMATIONS = {
  hot: 'animate-navbadge-hot',
  new: 'animate-navbadge-new',
  sale: 'animate-navbadge-sale',
  boom: 'animate-navbadge-boom',
  trending: 'animate-navbadge-trending',
  popular: 'animate-navbadge-popular',
  best: 'animate-navbadge-best',
} as const;

type BadgeVariant = keyof typeof VARIANTS;

export interface NavBadgeConfig {
  text: string;
  variant: BadgeVariant;
}

export function NavBadge({ config }: { config: NavBadgeConfig }) {
  const v = VARIANTS[config.variant] ?? VARIANTS.hot;
  const anim = ANIMATIONS[config.variant] ?? ANIMATIONS.hot;

  return (
    <span
      className={`${anim} ${v.bg} ${v.shadow} inline-flex items-center gap-0.5 rounded-full px-1.5 py-[1px] text-[9px] font-black uppercase leading-tight text-white shadow-sm`}
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inset-0 rounded-full bg-white/70 animate-navbadge-ping" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
      </span>
      {config.text}
    </span>
  );
}
