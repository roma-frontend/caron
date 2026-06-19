'use client';

import { useSettings } from '@/hooks/useSettings';
import Image from 'next/image';

interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 36, className }: LogoProps) {
  const settings = useSettings();

  if (settings?.logoUrl) {
    return <Image src={settings.logoUrl} alt="Logo" width={size} height={size} className={className} style={{ objectFit: 'contain' }} />;
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="caronLogoBg" x1="0" y1="0" x2="0" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#1A7BD4" />
          <stop offset="0.55" stopColor="#0066AE" />
          <stop offset="1" stopColor="#064D86" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="12" fill="url(#caronLogoBg)" />
      {/* subtle top sheen */}
      <rect width="48" height="24" rx="12" fill="#FFFFFF" opacity="0.06" />
      {/* monogram C / rotor ring */}
      <path d="M31.7 33.2 A12 12 0 1 1 31.7 14.8" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" fill="none" />
      {/* accent hub */}
      <circle cx="24" cy="24" r="3.1" fill="#FFB020" />
    </svg>
  );
}
