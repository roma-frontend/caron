const LEGACY_R2_HOST_SUFFIX = '.r2.cloudflarestorage.com';

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

  try {
    const parsed = new URL(imageUrl);
    const driveId = extractGoogleDriveFileId(parsed);
    if (driveId) {
      return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(driveId)}`;
    }

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
