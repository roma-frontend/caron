'use client';

import NextLink from 'next/link';
import { forwardRef } from 'react';
import type { ComponentProps } from 'react';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { localizedPath } from '@/lib/i18n/locale';

type NextLinkProps = ComponentProps<typeof NextLink>;

/**
 * Drop-in replacement for `next/link` on the storefront. Internal string hrefs
 * are prefixed with the current URL locale (hy stays unprefixed), so SPA
 * navigation keeps the visitor inside their language. External links, hashes,
 * mailto/tel, admin links and object hrefs are passed through untouched.
 */
function isLocalizable(href: NextLinkProps['href']): href is string {
  if (typeof href !== 'string') return false;
  if (!href.startsWith('/')) return false; // external / relative / hash
  if (href.startsWith('//')) return false; // protocol-relative
  if (href.startsWith('/admin')) return false; // admin is single-language
  return true;
}

export const LocalizedLink = forwardRef<HTMLAnchorElement, NextLinkProps>(
  function LocalizedLink({ href, ...props }, ref) {
    const locale = useLocale();
    const finalHref = locale && isLocalizable(href) ? localizedPath(href, locale) : href;
    return <NextLink ref={ref} href={finalHref} {...props} />;
  },
);

export default LocalizedLink;
