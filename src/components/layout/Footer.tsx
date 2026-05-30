'use client';

import Link from 'next/link';
import { Phone, Mail, MapPin } from 'lucide-react';
import { Logo } from '@/components/layout/Logo';
import { Separator } from '@/components/ui/separator';
import { SITE, NAV, FOOTER } from '@/lib/constants';
import { useSettings } from '@/hooks/useSettings';
import { useStoreName } from '@/hooks/useStoreName';

const SOCIALS = [
  { label: 'Instagram', href: 'https://instagram.com', icon: 'instagram' },
  { label: 'Facebook', href: 'https://facebook.com', icon: 'facebook' },
  { label: 'Telegram', href: 'https://t.me', icon: 'telegram' },
  { label: 'YouTube', href: 'https://youtube.com', icon: 'youtube' },
];

function SocialIcon({ icon }: { icon: string }) {
  switch (icon) {
    case 'instagram':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
          <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
          <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
        </svg>
      );
    case 'facebook':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
        </svg>
      );
    case 'telegram':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
          <path d="M21.5 2.5L2.5 10.5L8.5 13.5L11.5 20.5L15.5 14.5L21.5 2.5Z" />
          <path d="M11.5 20.5L15.5 14.5L8.5 13.5" />
        </svg>
      );
    case 'youtube':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
          <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.94 2C5.12 20 12 20 12 20s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
          <polygon points="9.75 8.75 15.5 12 9.75 15.25 9.75 8.75" />
        </svg>
      );
    default:
      return null;
  }
}

export function Footer() {
  const storeName = useStoreName();
  const settings = useSettings();
  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto" style={{ maxWidth: 'var(--container-max)', paddingInline: 'var(--space-container)', paddingBlock: 'var(--space-12)' }}>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div>
            <Link href="/" className="flex items-center gap-2 shrink-0 mb-4">
            <Logo size={36} />
            <span className="hidden text-xl font-bold sm:inline">{storeName}</span>
          </Link>
            <p className="text-muted-foreground" style={{ fontSize: 'var(--text-sm)' }}>{SITE.heroDesc}</p>
            <div className="mt-4 flex items-center gap-3">
              {SOCIALS.map((s) => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border bg-background text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary hover:shadow-md">
                  <SocialIcon icon={s.icon} />
                </a>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-semibold" style={{ marginBottom: 'var(--space-3)' }}>{FOOTER.navigation}</h4>
            <nav className="flex flex-col text-muted-foreground" style={{ gap: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>
              <Link href="/products" className="hover:text-foreground" style={{ transition: 'color var(--transition-fast)' }}>{NAV.catalog}</Link>
              <Link href="/categories" className="hover:text-foreground" style={{ transition: 'color var(--transition-fast)' }}>{NAV.categories}</Link>
              <Link href="/promotions" className="hover:text-foreground" style={{ transition: 'color var(--transition-fast)' }}>{NAV.promotions}</Link>
            </nav>
          </div>
          <div>
            <h4 className="font-semibold" style={{ marginBottom: 'var(--space-3)' }}>{FOOTER.info}</h4>
            <nav className="flex flex-col text-muted-foreground" style={{ gap: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>
              <Link href="/about" className="hover:text-foreground" style={{ transition: 'color var(--transition-fast)' }}>{NAV.about}</Link>
              <Link href="/delivery" className="hover:text-foreground" style={{ transition: 'color var(--transition-fast)' }}>{FOOTER.delivery}</Link>
              <Link href="/returns" className="hover:text-foreground" style={{ transition: 'color var(--transition-fast)' }}>{FOOTER.returns}</Link>
              <Link href="/privacy" className="hover:text-foreground" style={{ transition: 'color var(--transition-fast)' }}>{FOOTER.privacy}</Link>
              <Link href="/terms" className="hover:text-foreground" style={{ transition: 'color var(--transition-fast)' }}>{FOOTER.terms}</Link>
              <Link href="/order-status" className="hover:text-foreground" style={{ transition: 'color var(--transition-fast)' }}>{'Պատվերի ստուգում'}</Link>
            </nav>
          </div>
          <div>
            <h4 className="font-semibold" style={{ marginBottom: 'var(--space-3)' }}>{FOOTER.contacts}</h4>
            <div className="flex flex-col text-muted-foreground" style={{ gap: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>
              <Link href={`tel:${settings?.phone || "+374 XX XXX XXX"}`} className="flex items-center hover:text-foreground transition-colors" style={{ gap: 'var(--space-2)' }}><Phone style={{ height: '1rem', width: '1rem' }} /> {settings?.phone || "+374 XX XXX XXX"}</Link>
              <Link href={`mailto:${settings?.email || "info@autoparts.am"}`} className="flex items-center hover:text-foreground transition-colors" style={{ gap: 'var(--space-2)' }}><Mail style={{ height: '1rem', width: '1rem' }} /> {settings?.email || "info@autoparts.am"}</Link>
              <Link href={`https://www.google.com/maps/search/${encodeURIComponent(settings?.address || "Еրևան, Հայաստան")}`} target="_blank" rel="noopener noreferrer" className="flex items-center hover:text-foreground transition-colors" style={{ gap: 'var(--space-2)' }}><MapPin style={{ height: '1rem', width: '1rem' }} /> {settings?.address || "Еրևան, Հայաստան"}</Link>
            </div>
          </div>
        </div>
        <Separator style={{ marginBlock: 'var(--space-8)' }} />
        <p className="text-center text-muted-foreground" style={{ fontSize: 'var(--text-sm)' }}>{FOOTER.rights}</p>
      </div>
    </footer>
  );
}
