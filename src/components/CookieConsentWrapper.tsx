'use client';

import { useSettings } from '@/hooks/useSettings';
import { CookieConsent } from '@/components/CookieConsent';

export function CookieConsentWrapper() {
  const settings = useSettings();
  if (!settings?.enableCookieConsent) return null;
  return <CookieConsent text={settings.cookieConsentText || 'Մենք օգտագործում ենք Cookie-ներ կայքի աշխատանքը բարելավելու համար'} />;
}
