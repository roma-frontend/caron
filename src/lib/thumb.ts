// Derive the catalog thumbnail URL from a full product image URL, by convention:
// an upload stores `products/<uuid>` (≤1600px) plus `products/<uuid>-thumb`
// (~400px). This rewrites a full URL to its `-thumb` sibling so grids/lists can
// download a fraction of the bytes. Falls back to the input for anything that
// isn't one of our extension-less R2 product keys (external images, data URLs,
// already-thumbnailed URLs), and the UI additionally falls back at runtime if a
// `-thumb` object doesn't exist yet.

/** Append `-thumb` to the last path segment when it's an R2 product object key. */
function transformProductSegment(u: URL): boolean {
  const parts = u.pathname.split('/');
  const last = parts[parts.length - 1];
  const prev = parts[parts.length - 2];
  // Our product keys live under `products/` and have no file extension.
  if (prev !== 'products' || !last || last.includes('.') || last.endsWith('-thumb')) return false;
  parts[parts.length - 1] = `${last}-thumb`;
  u.pathname = parts.join('/');
  return true;
}

export function toThumbUrl(url?: string | null): string | null | undefined {
  if (!url) return url;

  // Same-origin proxy form: /api/r2-image?url=<encoded direct url>
  if (url.startsWith('/api/r2-image?')) {
    try {
      const outer = new URL(url, 'https://_');
      const inner = outer.searchParams.get('url');
      if (inner) {
        const iu = new URL(inner);
        if (transformProductSegment(iu)) {
          outer.searchParams.set('url', iu.toString());
          return `/api/r2-image?${outer.searchParams.toString()}`;
        }
      }
    } catch {
      /* keep original */
    }
    return url;
  }

  try {
    const u = new URL(url);
    return transformProductSegment(u) ? u.toString() : url;
  } catch {
    return url;
  }
}
