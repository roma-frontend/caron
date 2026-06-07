'use client';

import { VinDecoder } from '@/components/VinDecoder';
import { useSettings } from '@/hooks/useSettings';
import Link from 'next/link';

export default function VinDecoderPage() {
  const settings = useSettings();
  if (settings && !settings.enableVinDecoder) {
    return (
      <div className="mx-auto py-16 text-center" style={{ maxWidth: 'var(--container-max)', paddingInline: 'var(--space-container)' }}>
        <h1 className="text-2xl font-bold">VIN ապակոդավորում</h1>
        <p className="mt-3 text-muted-foreground">Այս ֆունկցիան ժամանակավոր անհասանելի է</p>
        <Link href="/products" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
          Դիտել բոլոր ապրանքները
        </Link>
      </div>
    );
  }
  return (
    <div className="mx-auto py-12" style={{ maxWidth: 'var(--container-max)', paddingInline: 'var(--space-container)' }}>
      <VinDecoder />
    </div>
  );
}
