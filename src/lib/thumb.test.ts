import { describe, it, expect } from 'vitest';
import { toThumbUrl } from './thumb';

describe('toThumbUrl', () => {
  it('returns falsy input unchanged', () => {
    expect(toThumbUrl(undefined)).toBeUndefined();
    expect(toThumbUrl(null)).toBeNull();
    expect(toThumbUrl('')).toBe('');
  });

  it('appends -thumb to an R2 product object key', () => {
    expect(toThumbUrl('https://cdn.example.com/products/abc123')).toBe(
      'https://cdn.example.com/products/abc123-thumb',
    );
  });

  it('leaves URLs whose last segment has a file extension', () => {
    const u = 'https://cdn.example.com/products/abc123.jpg';
    expect(toThumbUrl(u)).toBe(u);
  });

  it('does not double-append when already thumbnailed', () => {
    const u = 'https://cdn.example.com/products/abc123-thumb';
    expect(toThumbUrl(u)).toBe(u);
  });

  it('leaves keys not under products/ unchanged', () => {
    const u = 'https://cdn.example.com/other/abc123';
    expect(toThumbUrl(u)).toBe(u);
  });

  it('leaves non-URL / data URL strings unchanged', () => {
    expect(toThumbUrl('not a url')).toBe('not a url');
    expect(toThumbUrl('data:image/png;base64,AAAA')).toBe('data:image/png;base64,AAAA');
  });

  it('rewrites the inner url of the r2-image proxy form', () => {
    const inner = 'https://cdn.example.com/products/abc123';
    const proxied = `/api/r2-image?url=${encodeURIComponent(inner)}`;
    const out = toThumbUrl(proxied);
    expect(out).toContain('products%2Fabc123-thumb');
    expect(out?.startsWith('/api/r2-image?url=')).toBe(true);
  });

  it('leaves the proxy form unchanged when the inner key is not transformable', () => {
    const inner = 'https://cdn.example.com/products/abc123.jpg';
    const proxied = `/api/r2-image?url=${encodeURIComponent(inner)}`;
    expect(toThumbUrl(proxied)).toBe(proxied);
  });
});
