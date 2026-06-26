'use client';

import { useSettings } from '@/hooks/useSettings';
import { CookieConsent } from '@/components/CookieConsent';
import { useT } from '@/lib/i18n/admin';

export function CookieConsentWrapper() {
  const { t } = useT();
  const settings = useSettings();
  if (!settings?.enableCookieConsent) return null;
  return <CookieConsent text={settings.cookieConsentText || t('sx.cookie.text')} />;
}
