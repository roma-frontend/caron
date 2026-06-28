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

// Optional public R2 host (custom domain bound to the bucket, e.g.
// "https://img.caron.group"). When set, media is served DIRECTLY from
// Cloudflare's CDN — free R2 egress, native range requests, zero Vercel
// bandwidth/compute. Until configured, the same-origin /api/r2-media proxy is
// used, so this is a safe, inert addition.
const PUBLIC_HOST = (process.env.NEXT_PUBLIC_R2_PUBLIC_HOST || '').replace(/\/+$/, '');

/** Resolve a media source to a delivery URL (direct CDN if configured, else proxy). */
export function toR2MediaProxyUrl(src: string): string {
  let key = normalizeR2Key(src);

  if (!key) {
    try {
      const parsed = new URL(src);
      const host = parsed.hostname.toLowerCase();
      const isR2Host = host.endsWith('.r2.dev') || host.endsWith('.r2.cloudflarestorage.com');
      if (!isR2Host) return src;
      key = normalizeR2Key(parsed.pathname);
    } catch {
      return src;
    }
  }

  if (!key) return src;

  // Prefer direct delivery from the R2 custom domain (free egress + CDN cache);
  // otherwise route through the same-origin proxy.
  if (PUBLIC_HOST) return `${PUBLIC_HOST}/${key}`;
  return `/api/r2-media?key=${encodeURIComponent(key)}`;
}
