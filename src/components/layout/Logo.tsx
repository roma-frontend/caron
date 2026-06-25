'use client';

import { useSettings } from '@/hooks/useSettings';
import Image from 'next/image';

interface LogoProps {
  /** Height of the wordmark in px (width scales by aspect ratio). */
  size?: number;
  className?: string;
}

// Intrinsic dimensions of the generated wordmark (791 x 200 → ratio 3.955).
const LOGO_W = 791;
const LOGO_H = 200;
const ASPECT = LOGO_W / LOGO_H;

export function Logo({ size = 32, className }: LogoProps) {
  const settings = useSettings();
  const width = Math.round(size * ASPECT);

  // Admin override: a single custom logo for both themes.
  if (settings?.logoUrl) {
    return (
      <Image
        src={settings.logoUrl}
        alt="CARON GROUP"
        width={width}
        height={size}
        className={className}
        style={{ height: size, width: 'auto', objectFit: 'contain' }}
        loading="eager"
      />
    );
  }

  // Theme-aware wordmark. CSS toggles which variant is shown (no JS, no flash).
  return (
    <>
      {/* Light theme → blue wordmark */}
      <Image
        src="/logo/caron-light.png"
        alt="CARON GROUP"
        width={LOGO_W}
        height={LOGO_H}
        className={`${className ?? ''} block dark:hidden`}
        style={{ height: size, width: 'auto', objectFit: 'contain' }}
        loading="eager"
      />
      {/* Dark theme → white wordmark */}
      <Image
        src="/logo/caron-dark.png"
        alt="CARON GROUP"
        width={LOGO_W}
        height={LOGO_H}
        className={`${className ?? ''} hidden dark:block`}
        style={{ height: size, width: 'auto', objectFit: 'contain' }}
        loading="eager"
      />
    </>
  );
}
