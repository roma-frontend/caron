'use client';

import { useSyncExternalStore } from 'react';
import { X, ArrowRight, Sparkles, Zap, Truck, Clock, Gift, Percent, Bell, Star } from 'lucide-react';
import Link from 'next/link';
import { useT } from '@/lib/i18n/admin';

const ANNOUNCEMENT_DISMISS_EVENT = 'announcement-dismiss';

function subscribe(callback: () => void) {
  if (typeof window === 'undefined') return () => {};

  const handleChange = () => callback();
  window.addEventListener('storage', handleChange);
  window.addEventListener(ANNOUNCEMENT_DISMISS_EVENT, handleChange);

  return () => {
    window.removeEventListener('storage', handleChange);
    window.removeEventListener(ANNOUNCEMENT_DISMISS_EVENT, handleChange);
  };
}

type AnnouncementStyle = 'info' | 'sale' | 'promo' | 'dark' | 'custom';

function hashStr(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

interface AnnouncementConfig {
  text?: string;
  textRu?: string;
  textEn?: string;
  type?: AnnouncementStyle;
  link?: string;
  linkText?: string;
  linkTextRu?: string;
  linkTextEn?: string;
  dismissible?: boolean;
  icon?: 'sparkles' | 'zap' | 'truck' | 'clock' | 'gift' | 'percent' | 'bell' | 'star';
  gradient?: string;
  /** Legacy plain text fallback */
  _raw?: string;
}

function parseAnnouncement(raw: string): AnnouncementConfig {
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed;
    }
  } catch {}
  return { text: raw, type: 'info', _raw: raw };
}

const STYLES: Record<AnnouncementStyle, { className: string }> = {
  info: {
    className: 'bg-muted text-foreground border-b border-border',
  },
  sale: {
    className: 'bg-destructive text-destructive-foreground border-b border-destructive',
  },
  promo: {
    className: 'bg-primary text-primary-foreground border-b border-primary',
  },
  dark: {
    className: 'bg-foreground text-background border-b border-foreground',
  },
  custom: {
    className: 'bg-muted text-foreground border-b border-border',
  },
};

const ICONS = {
  sparkles: Sparkles,
  zap: Zap,
  truck: Truck,
  clock: Clock,
  gift: Gift,
  percent: Percent,
  bell: Bell,
  star: Star,
};

export function AnnouncementBar({ raw, phone }: { raw?: string | null; phone?: string | null }) {
  const { t, lang } = useT();
  const dismissKey = raw ? `announcement_dismissed_${hashStr(raw)}` : null;
  const dismissed = useSyncExternalStore(
    subscribe,
    () => (dismissKey ? localStorage.getItem(dismissKey) === '1' : false),
    () => false,
  );

  if (!raw || dismissed) return null;

  const config = parseAnnouncement(raw);
  const styleClass = STYLES[config.type ?? 'info'].className;
  const Icon = config.icon ? ICONS[config.icon] : null;
  const text = (lang === 'ru' ? config.textRu : lang === 'en' ? config.textEn : undefined)?.trim() || config.text;
  const linkText = (lang === 'ru' ? config.linkTextRu : lang === 'en' ? config.linkTextEn : undefined)?.trim() || config.linkText;

  const dismiss = () => {
    let hash = 0;
    for (let i = 0; i < raw.length; i++) hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0;
    const key = `announcement_dismissed_${Math.abs(hash).toString(36)}`;
    localStorage.setItem(key, '1');
    window.dispatchEvent(new Event(ANNOUNCEMENT_DISMISS_EVENT));
  };

  const content = (
    <div className={`relative overflow-hidden ${styleClass}`}>

      <div className="mx-auto flex items-center justify-center gap-1.5 px-4 py-2 sm:py-2.5 text-center text-[11px] sm:text-xs font-medium leading-tight max-w-[var(--container-max)]"
      >
        {Icon && <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" />}

        <span className="line-clamp-1 sm:line-clamp-none">{text}</span>

        {config.link && (
          <>
            <span className="h-1 w-1 shrink-0 rounded-full bg-current opacity-30" />
            <Link href={config.link} className="inline-flex items-center gap-1 font-semibold whitespace-nowrap underline-offset-2 hover:underline" onClick={(e) => e.stopPropagation()}>
              {linkText || t('sx.announce.learnMore')} <ArrowRight className="h-3 w-3" />
            </Link>
          </>
        )}

        {!config.link && phone && (
          <>
            <span className="hidden sm:inline h-1 w-1 shrink-0 rounded-full bg-current opacity-30" />
            <span className="hidden sm:inline opacity-60">{phone}</span>
          </>
        )}

        {config.dismissible !== false && (
          <button onClick={dismiss} className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full opacity-50 transition-opacity hover:opacity-100 hover:bg-black/10" aria-label={t('sx.close')}>
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );

  if (config.link && !config.dismissible) {
    return (
      <Link href={config.link} className="block no-underline">
        {content}
      </Link>
    );
  }

  return content;
}
