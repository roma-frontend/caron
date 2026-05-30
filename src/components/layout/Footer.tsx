'use client';

import Link from 'next/link';
import { Phone, Mail, MapPin } from 'lucide-react';
import { Logo } from '@/components/layout/Logo';
import { Separator } from '@/components/ui/separator';
import { SITE, NAV, FOOTER } from '@/lib/constants';
import { useSettings } from '@/hooks/useSettings';
import { useStoreName } from '@/hooks/useStoreName';

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
              <Link href="/order-status" className="hover:text-foreground" style={{ transition: 'color var(--transition-fast)' }}>{'Պատվերի կարգավիճակ'}</Link>
            </nav>
          </div>
          <div>
            <h4 className="font-semibold" style={{ marginBottom: 'var(--space-3)' }}>{FOOTER.contacts}</h4>
            <div className="flex flex-col text-muted-foreground" style={{ gap: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>
              <Link href={`tel:${settings?.phone || "+374 XX XXX XXX"}`} className="flex items-center hover:text-foreground transition-colors" style={{ gap: 'var(--space-2)' }}><Phone style={{ height: '1rem', width: '1rem' }} /> {settings?.phone || "+374 XX XXX XXX"}</Link>
              <Link href={`mailto:${settings?.email || "info@autoparts.am"}`} className="flex items-center hover:text-foreground transition-colors" style={{ gap: 'var(--space-2)' }}><Mail style={{ height: '1rem', width: '1rem' }} /> {settings?.email || "info@autoparts.am"}</Link>
              <Link href={`https://www.google.com/maps/search/${encodeURIComponent(settings?.address || "Երևան, Հայաստան")}`} target="_blank" rel="noopener noreferrer" className="flex items-center hover:text-foreground transition-colors" style={{ gap: 'var(--space-2)' }}><MapPin style={{ height: '1rem', width: '1rem' }} /> {settings?.address || "Երևան, Հայաստան"}</Link>
            </div>
          </div>
        </div>
        <Separator style={{ marginBlock: 'var(--space-8)' }} />
        <p className="text-center text-muted-foreground" style={{ fontSize: 'var(--text-sm)' }}>{FOOTER.rights}</p>
      </div>
    </footer>
  );
}
