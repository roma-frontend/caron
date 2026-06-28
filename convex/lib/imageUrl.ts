const LEGACY_R2_HOST_SUFFIX = '.r2.cloudflarestorage.com';
// Public Cloudflare R2 dev/bucket domain (e.g. pub-xxxx.r2.dev). Vercel refuses
// to optimize these as *remote* images (HTTP 402), so we route them through the
// same-origin /api/r2-image proxy, which Vercel optimizes as a local source.
const R2_DEV_HOST_SUFFIX = '.r2.dev';
const IMAGE_FILE_RE = /\.(png|jpe?g|webp|gif|avif|svg)(\?.*)?$/i;

// Optional public R2 host (a custom domain bound to the bucket, e.g.
// "https://img.caron.group", or the bucket's public r2.dev URL). When set, R2
// image URLs are rewritten to be served DIRECTLY from Cloudflare's CDN instead
// of through the Vercel proxy — Cloudflare R2 egress is free/unlimited, so this
// takes image bandwidth and function invocations off Vercel entirely. Until it
// is configured the proxy path is used, so this is a safe, inert addition.
//
// NB: env vars are read INSIDE the function — in Convex `process.env` is only
// reliably populated within a running function, not at module-load time.
/** Rewrite an R2 object URL to the public host URL, or null if unset. */
function toPublicDirectUrl(parsed: URL): string | null {
  const publicHost = (process.env.R2_PUBLIC_HOST || '').replace(/\/+$/, '');
  if (!publicHost) return null;
  const bucket = process.env.R2_BUCKET_NAME || '';
  let key = parsed.pathname.replace(/^\/+/, '');
  // Path-style private URLs include the bucket as the first path segment.
  if (bucket && (key === bucket || key.startsWith(`${bucket}/`))) {
    key = key.slice(bucket.length).replace(/^\/+/, '');
  }
  if (!key) return null;
  return `${publicHost}/${key}`;
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

  // Many existing images are stored as the same-origin proxy path
  // "/api/r2-image?url=<encoded R2 url>". When a public R2 host is configured,
  // unwrap the inner URL and serve it directly from Cloudflare (free egress,
  // no Vercel function). Otherwise keep the proxy path untouched.
  if (trimmed.startsWith('/api/r2-image?')) {
    try {
      const inner = new URL(trimmed, 'https://_').searchParams.get('url');
      if (inner) {
        const innerParsed = new URL(inner);
        if (
          innerParsed.hostname.endsWith(LEGACY_R2_HOST_SUFFIX) ||
          innerParsed.hostname.endsWith(R2_DEV_HOST_SUFFIX)
        ) {
          const direct = toPublicDirectUrl(innerParsed);
          if (direct) return direct;
        }
      }
    } catch {
      /* fall through — keep the original proxy path */
    }
    return trimmed;
  }

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
