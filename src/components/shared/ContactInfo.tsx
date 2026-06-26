'use client';

import { useSettings } from '@/hooks/useSettings';
import { useT } from '@/lib/i18n/admin';

export function ContactInfo() {
  const { t } = useT();
  const settings = useSettings();
  return (
    <ul>
      <li>{t('cmp.contact_email')} {settings?.email ?? 'info@caron.group'}</li>
      <li>{t('cmp.contact_phone')} {settings?.phone ?? '+374 XX XXX XXX'}</li>
      <li>{t('cmp.contact_address')} {settings?.address ?? t('cmp.default_address')}</li>
    </ul>
  );
}
