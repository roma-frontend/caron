const LEGACY_R2_HOST_SUFFIX = '.r2.cloudflarestorage.com';
// Public Cloudflare R2 dev/bucket domain (e.g. pub-xxxx.r2.dev). Vercel refuses
// to optimize these as *remote* images (HTTP 402), so we route them through the
// same-origin /api/r2-image proxy, which Vercel optimizes as a local source.
const R2_DEV_HOST_SUFFIX = '.r2.dev';
const IMAGE_FILE_RE = /\.(png|jpe?g|webp|gif|avif|svg)(\?.*)?$/i;

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
    return `/api/r2-image?url=${encodeURIComponent(trimmed)}`;
  } catch {
    return normalizeLocalImagePath(trimmed);
  }
}

export function normalizeImageUrls(urls?: string[] | null): string[] | null | undefined {
  if (!urls) return urls;
  return urls.map((url) => normalizeImageUrl(url) ?? '');
}
