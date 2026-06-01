'use client';

import { useSettings } from '@/hooks/useSettings';

export function ContactInfo() {
  const settings = useSettings();
  return (
    <ul>
      <li>Էլ. փոստ՝ {settings?.email ?? 'info@caron.am'}</li>
      <li>Հեռախոս՝ {settings?.phone ?? '+374 XX XXX XXX'}</li>
      <li>Հասցե՝ {settings?.address ?? 'Երևան, Հայաստան'}</li>
    </ul>
  );
}
