const LEGACY_R2_HOST_SUFFIX = '.r2.cloudflarestorage.com';
// Public Cloudflare R2 dev/bucket domain (e.g. pub-xxxx.r2.dev). Vercel refuses
// to optimize these as *remote* images (HTTP 402), so we route them through the
// same-origin /api/r2-image proxy, which Vercel optimizes as a local source.
const R2_DEV_HOST_SUFFIX = '.r2.dev';
const IMAGE_FILE_RE = /\.(png|jpe?g|webp|gif|avif|svg)(\?.*)?$/i;

// Optional public R2 host (a custom domain bound to the bucket, e.g.
// "https://img.caron.group"). When set, R2 image URLs are rewritten to be
// served DIRECTLY from Cloudflare's CDN instead of through the Vercel proxy —
// Cloudflare R2 egress is free/unlimited, so this takes image bandwidth and
// function invocations off Vercel entirely. Until it is configured the proxy
// path is used, so this is a safe, inert addition.
const R2_PUBLIC_HOST = (process.env.R2_PUBLIC_HOST || '').replace(/\/+$/, '');
const R2_BUCKET = process.env.R2_BUCKET_NAME || '';

/** Rewrite an R2 object URL to the public custom-domain URL, or null if unset. */
function toPublicDirectUrl(parsed: URL): string | null {
  if (!R2_PUBLIC_HOST) return null;
  let key = parsed.pathname.replace(/^\/+/, '');
  // Path-style private URLs include the bucket as the first path segment.
  if (R2_BUCKET && (key === R2_BUCKET || key.startsWith(`${R2_BUCKET}/`))) {
    key = key.slice(R2_BUCKET.length).replace(/^\/+/, '');
  }
  if (!key) return null;
  return `${R2_PUBLIC_HOST}/${key}`;
}

function normalizeLocalImagePath(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;

  if (value.startsWith('data:image/') || value.startsWith('blob:')) return value;
  if (value.startsWith('/')) return value;

  // Accept relative image-like filenames and API paths, otherwise ignore
  // ambiguous strings such as "products" which can trigger 404 requests.
  if (IMAGE_FILE_RE.test(value) || value.startsWith('api/')) return `/${value}`;

  return null;
}

function extractGoogleDriveFileId(parsed: URL): string | null {
  const host = parsed.hostname.toLowerCase();
  if (host !== 'drive.google.com') return null;

  const filePathMatch = parsed.pathname.match(/\/file\/d\/([^/]+)/i);
  if (filePathMatch?.[1]) return filePathMatch[1];

  const idFromSearch = parsed.searchParams.get('id');
  if (idFromSearch) return idFromSearch;

  return null;
}

export function normalizeImageUrl(imageUrl?: string | null): string | null | undefined {
  if (!imageUrl) return imageUrl;

  const trimmed = imageUrl.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    const driveId = extractGoogleDriveFileId(parsed);
    if (driveId) {
      return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(driveId)}`;
    }

    if (!parsed.hostname.endsWith(LEGACY_R2_HOST_SUFFIX) && !parsed.hostname.endsWith(R2_DEV_HOST_SUFFIX)) return trimmed;
    // Prefer direct Cloudflare delivery (free egress, no Vercel) when a public
    // host is configured; otherwise fall back to the same-origin proxy.
    return toPublicDirectUrl(parsed) ?? `/api/r2-image?url=${encodeURIComponent(trimmed)}`;
  } catch {
    return normalizeLocalImagePath(trimmed);
  }
}

export function normalizeImageUrls(urls?: string[] | null): string[] | null | undefined {
  if (!urls) return urls;
  return urls.map((url) => normalizeImageUrl(url) ?? '');
}
