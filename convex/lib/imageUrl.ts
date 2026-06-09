const LEGACY_R2_HOST_SUFFIX = '.r2.cloudflarestorage.com';

export function normalizeImageUrl(imageUrl?: string | null): string | null | undefined {
  if (!imageUrl) return imageUrl;

  try {
    const parsed = new URL(imageUrl);
    if (!parsed.hostname.endsWith(LEGACY_R2_HOST_SUFFIX)) return imageUrl;
    return `/api/r2-image?url=${encodeURIComponent(imageUrl)}`;
  } catch {
    return imageUrl;
  }
}

export function normalizeImageUrls(urls?: string[] | null): string[] | null | undefined {
  if (!urls) return urls;
  return urls.map((url) => normalizeImageUrl(url) ?? '');
}
