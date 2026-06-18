function normalizeR2Key(raw: string): string | null {
  const cleaned = raw.replace(/^\/+/, '');
  if (!cleaned) return null;

  if (cleaned.startsWith('products/')) return cleaned;

  const parts = cleaned.split('/').filter(Boolean);
  if (parts.length >= 2 && parts[1].startsWith('products/')) {
    return parts.slice(1).join('/');
  }

  return null;
}

export function toR2MediaProxyUrl(src: string): string {
  const directKey = normalizeR2Key(src);
  if (directKey) return `/api/r2-media?key=${encodeURIComponent(directKey)}`;

  try {
    const parsed = new URL(src);
    const host = parsed.hostname.toLowerCase();
    const isR2Host = host.endsWith('.r2.dev') || host.endsWith('.r2.cloudflarestorage.com');
    if (!isR2Host) return src;

    const key = normalizeR2Key(parsed.pathname);
    if (!key) return src;

    return `/api/r2-media?key=${encodeURIComponent(key)}`;
  } catch {
    return src;
  }
}
