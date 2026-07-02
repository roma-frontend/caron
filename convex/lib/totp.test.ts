import { describe, it, expect } from 'vitest';
import { generateBase32Secret, verifyTotp, otpauthUri, sha256Hex, generateRecoveryCodes } from './totp';

// A private helper to compute a valid code for "now" against a secret, using
// the same algorithm the module verifies with. We derive it by brute-checking
// that verifyTotp accepts the code we generate here would be circular, so
// instead we assert known RFC 6238 behaviour and structural properties.

describe('base32 secret', () => {
  it('generates a base32 secret (one symbol per byte, default 20)', () => {
    const s = generateBase32Secret();
    expect(s).toMatch(/^[A-Z2-7]{20}$/);
    expect(generateBase32Secret(10)).toMatch(/^[A-Z2-7]{10}$/);
  });
});

describe('verifyTotp (RFC 6238)', () => {
  // RFC 6238 SHA-1 vector: ASCII secret "12345678901234567890" == base32 below.
  const RFC_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

  it('accepts the code valid for a fixed counter via time mocking', () => {
    // T=59s → counter 1 → code 287082 (RFC vector). Freeze time to 59s.
    const orig = Date.now;
    Date.now = () => 59_000;
    try {
      // window 0 to pin exactly to counter 1
      return verifyTotp(RFC_SECRET, '287082', 30, 0).then((ok) => expect(ok).toBe(true));
    } finally {
      Date.now = orig;
    }
  });

  it('rejects a wrong code', async () => {
    const orig = Date.now;
    Date.now = () => 59_000;
    try {
      expect(await verifyTotp(RFC_SECRET, '000000', 30, 0)).toBe(false);
    } finally {
      Date.now = orig;
    }
  });

  it('rejects malformed input', async () => {
    expect(await verifyTotp(RFC_SECRET, '12ab')).toBe(false);
    expect(await verifyTotp(RFC_SECRET, '')).toBe(false);
  });

  it('accepts codes within the drift window', async () => {
    const orig = Date.now;
    // 287082 is counter 1 (T=30..59). At T=89 (counter 2) with window 1, counter 1 is still accepted.
    Date.now = () => 89_000;
    try {
      expect(await verifyTotp(RFC_SECRET, '287082', 30, 1)).toBe(true);
    } finally {
      Date.now = orig;
    }
  });
});

describe('otpauthUri', () => {
  it('builds a scannable otpauth URI', () => {
    const uri = otpauthUri('ABC234', 'owner@caron.group', 'Caron');
    expect(uri.startsWith('otpauth://totp/')).toBe(true);
    expect(uri).toContain('secret=ABC234');
    expect(uri).toContain('issuer=Caron');
    expect(decodeURIComponent(uri)).toContain('Caron:owner@caron.group');
  });
});

describe('recovery codes + sha256', () => {
  it('generates unique formatted codes', () => {
    const codes = generateRecoveryCodes(8);
    expect(codes).toHaveLength(8);
    for (const c of codes) expect(c).toMatch(/^[a-z2-7]{5}-[a-z2-7]{5}$/);
    expect(new Set(codes).size).toBe(8);
  });

  it('sha256Hex is stable and 64 hex chars', async () => {
    const a = await sha256Hex('hello');
    expect(a).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
});
