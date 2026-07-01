import sharp from 'sharp';

export interface OptimizedImage {
  buffer: Buffer;
  contentType: string;
}

/**
 * Server-side image optimization applied on upload before storing in R2:
 * down-scales oversized images and converts them to WebP (quality 80), which
 * typically cuts file size 60–90% with no visible loss. Animated GIFs are
 * passed through untouched (WebP conversion would flatten the animation).
 *
 * Runs in the Node runtime (sharp is native). Falls back to the original
 * bytes if anything goes wrong, so an upload never fails due to optimization.
 */
export async function optimizeImage(
  input: Buffer,
  mimeType: string,
  maxDim = 1600,
  quality = 80,
): Promise<OptimizedImage> {
  if (mimeType === 'image/gif') {
    return { buffer: input, contentType: 'image/gif' };
  }
  try {
    const buffer = await sharp(input, { failOn: 'none' })
      .rotate() // bake in EXIF orientation before stripping metadata
      .resize({ width: maxDim, height: maxDim, fit: 'inside', withoutEnlargement: true })
      .webp({ quality, effort: 4 })
      .toBuffer();
    return { buffer, contentType: 'image/webp' };
  } catch {
    return { buffer: input, contentType: mimeType };
  }
}
