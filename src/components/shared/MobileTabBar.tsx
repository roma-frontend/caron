'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Sparkles, ChevronRight, type LucideIcon } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export type TabItem = {
  href: string;
  icon: LucideIcon;
  label: string;
  active?: boolean;
  badge?: number;
  /** Extra attributes spread onto the icon (e.g. fly-to-cart targets). */
  iconAttrs?: Record<string, string>;
};

export type GridMenuItem = {
  icon: LucideIcon;
  label: string;
  href?: string;
  onClick?: () => void;
  badge?: number;
  /** Renders the card with the primary/accent highlight (e.g. logout). */
  highlight?: boolean;
};

/* -------------------------------------------------------------------------- */
/*  Bottom tab bar with central floating action button                        */
/* -------------------------------------------------------------------------- */

export function BottomTabBar({
  tabs,
  fabIcon: FabIcon,
  fabLabel,
  onFabClick,
}: {
  /** Exactly 4 tabs — 2 are placed left of the FAB, 2 to the right. */
  tabs: TabItem[];
  fabIcon: LucideIcon;
  fabLabel?: string;
  onFabClick: () => void;
}) {
  const left = tabs.slice(0, 2);
  const right = tabs.slice(2, 4);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur-md lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="relative mx-auto flex h-16 max-w-lg items-stretch">
        {left.map((t) => (
          <Tab key={t.label} {...t} />
        ))}

        {/* center slot reserved for the FAB */}
        <div className="flex w-16 shrink-0 items-start justify-center">
          <button
            type="button"
            onClick={onFabClick}
            aria-label={fabLabel ?? 'Menu'}
            className="-mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-4 ring-background transition-transform active:scale-95"
          >
            <FabIcon className="h-6 w-6" />
          </button>
        </div>

        {right.map((t) => (
          <Tab key={t.label} {...t} />
        ))}
      </div>
    </nav>
  );
}

function Tab({ href, icon: Icon, label, active, badge, iconAttrs }: TabItem) {
  return (
    <Link
      href={href}
      className={`relative flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors ${
        active ? 'text-primary' : 'text-muted-foreground'
      }`}
    >
      <span className="relative">
        <Icon className="h-5 w-5" {...iconAttrs} />
        {badge != null && badge > 0 && (
          <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold leading-none text-white">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </span>
      <span className="max-w-full truncate px-0.5">{label}</span>
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/*  Grid menu bottom sheet                                                    */
/* -------------------------------------------------------------------------- */

export function GridMenuSheet({
  open,
  onOpenChange,
  title,
  items,
  feature,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Accessible name for screen readers (not shown visually). */
  title: string;
  items: GridMenuItem[];
  /** Optional highlighted element rendered above the grid (e.g. AI assistant). */
  feature?: ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="rounded-t-3xl px-4 pt-2"
        style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))' }}
      >
        {/* Grab handle doubles as the close affordance (tap, or tap backdrop). */}
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label="Փակել"
          className="mx-auto mb-3 mt-1 block h-1.5 w-10 rounded-full bg-muted-foreground/30 transition-colors hover:bg-muted-foreground/50"
        />
        <SheetTitle className="sr-only">{title}</SheetTitle>

        {feature ? <div className="mb-3">{feature}</div> : null}

        <div className="grid max-h-[60vh] grid-cols-3 gap-3 overflow-y-auto pb-1">
          {items.map((item) => (
            <MenuCard key={item.label} item={item} onClose={() => onOpenChange(false)} />
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/**
 * A deliberately eye-catching, full-width entry point for the AI assistant —
 * gradient surface, live status dot and a slow shimmer sweep so it reads as a
 * "smart" feature rather than just another tile in the grid.
 */
export function AiMenuBanner({
  onClick,
  title = 'AI օգնական',
  subtitle = 'Հարցրեք ձեր հարցը',
}: {
  onClick: () => void;
  title?: string;
  subtitle?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/15 via-primary/5 to-transparent p-3.5 text-left transition-transform active:scale-[0.99]"
    >
      <style>{'@keyframes caronShimmer{0%{transform:translateX(-130%)}55%,100%{transform:translateX(130%)}}'}</style>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/15 to-transparent"
        style={{ animation: 'caronShimmer 3.4s ease-in-out infinite' }}
      />
      <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
        <Sparkles className="h-5 w-5" />
        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-background">
          <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping" />
        </span>
      </span>
      <span className="relative min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-sm font-semibold">
          {title}
          <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary">
            AI
          </span>
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">{subtitle}</span>
      </span>
      <ChevronRight className="relative h-4 w-4 shrink-0 text-primary" />
    </button>
  );
}

function MenuCard({ item, onClose }: { item: GridMenuItem; onClose: () => void }) {
  const { icon: Icon, label, badge, highlight } = item;

  const className = `flex flex-col items-center justify-center gap-2 rounded-2xl border p-4 text-center transition-colors active:scale-[0.97] ${
    highlight
      ? 'border-primary/40 bg-primary/10 text-primary'
      : 'border-border/60 bg-muted/40 text-foreground hover:bg-muted'
  }`;

  const inner = (
    <>
      <span className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-background/70">
        <Icon className="h-5 w-5" />
        {badge != null && badge > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold leading-none text-white">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </span>
      <span className="text-xs font-medium leading-tight">{label}</span>
    </>
  );

  if (item.href) {
    return (
      <Link href={item.href} onClick={onClose} className={className}>
        {inner}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        item.onClick?.();
        onClose();
      }}
      className={className}
    >
      {inner}
    </button>
  );
}
