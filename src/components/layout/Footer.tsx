'use client';

import Link from 'next/link';
import { Phone, Mail, MapPin } from 'lucide-react';
import { Logo } from '@/components/layout/Logo';
import { Separator } from '@/components/ui/separator';
import { useSettings } from '@/hooks/useSettings';
import { useStoreName } from '@/hooks/useStoreName';
import { NewsletterForm } from '@/components/NewsletterForm';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useT } from '@/lib/i18n/admin';

const SOCIAL_CONFIG: { key: string; label: string; href: string; icon: string; hover: string }[] = [
  { key: 'instagram', label: 'Instagram', href: 'https://instagram.com/', icon: 'instagram', hover: 'hover:text-[#E4405F] hover:border-[#E4405F]/40 hover:shadow-[#E4405F]/20' },
  { key: 'facebook', label: 'Facebook', href: 'https://facebook.com/', icon: 'facebook', hover: 'hover:text-[#1877F2] hover:border-[#1877F2]/40 hover:shadow-[#1877F2]/20' },
  { key: 'telegram', label: 'Telegram', href: 'https://t.me/', icon: 'telegram', hover: 'hover:text-[#0088cc] hover:border-[#0088cc]/40 hover:shadow-[#0088cc]/20' },
  { key: 'whatsapp', label: 'WhatsApp', href: 'https://wa.me/', icon: 'whatsapp', hover: 'hover:text-[#25D366] hover:border-[#25D366]/40 hover:shadow-[#25D366]/20' },
];

function socialUrl(setting: string | undefined, fallback: string): string {
  if (!setting || !setting.trim()) return fallback;
  const s = setting.trim();
  if (s.startsWith('http')) return s;
  return fallback + s.replace(/^@/, '');
}

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
    case 'whatsapp':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
          <path d="M17.498 14.382c-.303-.151-1.787-.873-2.064-.972-.277-.099-.478-.149-.679.149-.201.298-.78.972-.956 1.171-.176.199-.352.224-.655.075-.303-.149-1.28-.466-2.44-1.493-.902-.798-1.512-1.783-1.688-2.084-.176-.301-.019-.464.133-.613.134-.134.301-.352.452-.527.151-.176.201-.302.301-.503.101-.201.05-.377-.025-.528-.075-.151-.678-1.615-.929-2.213-.245-.582-.493-.502-.678-.512-.176-.01-.377-.01-.578-.01-.201 0-.528.075-.804.377s-1.055 1.022-1.055 2.492c0 1.47 1.078 2.891 1.229 3.09.151.199 2.11 3.22 5.113 4.516.714.309 1.272.493 1.707.631.718.229 1.371.197 1.887.12.574-.085 1.787-.724 2.04-1.423.251-.699.251-1.297.176-1.423-.075-.125-.277-.201-.579-.352z" />
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.69.886 5.174 2.382 7.175L1.17 22.679l3.624-1.157C6.73 22.797 9.282 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.6c-2.65 0-5.093-.913-7.038-2.438l-.509-.374-2.15.686.734-2.097-.332-.525A9.56 9.56 0 0 1 2.4 12c0-5.304 4.296-9.6 9.6-9.6s9.6 4.296 9.6 9.6-4.296 9.6-9.6 9.6z" />
        </svg>
      );
    default:
      return null;
  }
}

export function Footer() {
  const { t } = useT();
  const storeName = useStoreName();
  const settings = useSettings();
  return (
    <footer className="mt-auto border-t bg-muted/30">
      <div className="mx-auto max-w-[var(--container-max)] px-[max(var(--space-container),0.75rem)] py-[var(--space-12)]">
        <div className="grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-4">
          <div>
            <Link href="/" className="flex items-center shrink-0 mb-4" aria-label={storeName}>
            <Logo size={34} />
          </Link>
            <p className="text-muted-foreground" style={{ fontSize: 'var(--text-sm)' }}>{storeName}{t('pg.home.brandDescSuffix')}</p>
            <div className="mt-4 flex items-center gap-3">
              {SOCIAL_CONFIG.map((s) => {
                const val = settings ? (settings as Record<string, unknown>)[s.key] as string | undefined : undefined;
                const url = socialUrl(val, s.href);
                return (
                  <Tooltip key={s.key}>
                    <TooltipTrigger>
                      <Link href={url} target="_blank" rel="noopener noreferrer" aria-label={s.label}
                        className={`flex h-9 w-9 items-center justify-center rounded-xl border bg-background text-muted-foreground transition-all hover:-translate-y-0.5 hover:shadow-md ${s.hover}`}>
                        <SocialIcon icon={s.icon} />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent>{s.label}</TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>
          <div>
            <h4 className="font-semibold" style={{ marginBottom: 'var(--space-3)' }}>{t('cmp.navigation')}</h4>
            <nav className="flex flex-col text-muted-foreground [&>a]:block [&>a]:py-1.5" style={{ gap: 'var(--space-1)', fontSize: 'var(--text-sm)' }}>
              <Link href="/products" className="hover:text-foreground" style={{ transition: 'color var(--transition-fast)' }}>{t('cmp.nav_catalog')}</Link>
              <Link href="/categories" className="hover:text-foreground" style={{ transition: 'color var(--transition-fast)' }}>{t('cmp.nav_categories')}</Link>
              <Link href="/promotions" className="hover:text-foreground" style={{ transition: 'color var(--transition-fast)' }}>{t('cmp.nav_promotions')}</Link>
            </nav>
          </div>
          <div>
            <h4 className="font-semibold" style={{ marginBottom: 'var(--space-3)' }}>{t('sx.footer.info')}</h4>
            <nav className="flex flex-col text-muted-foreground [&>a]:block [&>a]:py-1.5" style={{ gap: 'var(--space-1)', fontSize: 'var(--text-sm)' }}>
              <Link href="/about" className="hover:text-foreground" style={{ transition: 'color var(--transition-fast)' }}>{t('cmp.nav_about')}</Link>
              <Link href="/delivery" className="hover:text-foreground" style={{ transition: 'color var(--transition-fast)' }}>{t('cmp.nav_delivery')}</Link>
              <Link href="/returns" className="hover:text-foreground" style={{ transition: 'color var(--transition-fast)' }}>{t('sp.return')}</Link>
              <Link href="/privacy" className="hover:text-foreground" style={{ transition: 'color var(--transition-fast)' }}>{t('sx.footer.privacy')}</Link>
              <Link href="/terms" className="hover:text-foreground" style={{ transition: 'color var(--transition-fast)' }}>{t('sx.footer.terms')}</Link>
              <Link href="/order-status" className="hover:text-foreground" style={{ transition: 'color var(--transition-fast)' }}>{t('sx.footer.orderCheck')}</Link>
            </nav>
          </div>
          <div>
            <h4 className="font-semibold" style={{ marginBottom: 'var(--space-3)' }}>{t('pg.contact.title')}</h4>
            <div className="flex flex-col text-muted-foreground [&>a]:py-1.5" style={{ gap: 'var(--space-1)', fontSize: 'var(--text-sm)' }}>
              <Link href={`tel:${settings?.phone || "+374 XX XXX XXX"}`} className="flex items-center hover:text-foreground transition-colors" style={{ gap: 'var(--space-2)' }}><Phone style={{ height: '1rem', width: '1rem' }} /> {settings?.phone || "+374 XX XXX XXX"}</Link>
              <Link href={`mailto:${settings?.email || "info@caron.group"}`} className="flex items-center hover:text-foreground transition-colors" style={{ gap: 'var(--space-2)' }}><Mail style={{ height: '1rem', width: '1rem' }} /> {settings?.email || "info@caron.group"}</Link>
              <Link href={`https://www.google.com/maps/search/${encodeURIComponent(settings?.address || "Երևան, Հայաստան")}`} target="_blank" rel="noopener noreferrer" className="flex items-center hover:text-foreground transition-colors" style={{ gap: 'var(--space-2)' }}><MapPin style={{ height: '1rem', width: '1rem' }} /> {settings?.address || t('sx.footer.addressFallback')}</Link>
            </div>
          </div>
        </div>

        {settings?.enableNewsletter && (
          <div className="mt-6 sm:mt-8 max-w-md mx-auto px-2 sm:px-0">
            <NewsletterForm />
          </div>
        )}

        <Separator style={{ marginBlock: 'var(--space-8)' }} />
        <p className="text-left text-muted-foreground" style={{ fontSize: 'var(--text-sm)' }}>© {new Date().getFullYear()} {storeName}. {t('sx.footer.rights')}</p>
      </div>
    </footer>
  );
}
