/**
 * Minimal TOTP (RFC 6238) implementation for staff two-factor auth, using the
 * Web Crypto API available in the Convex runtime (HMAC-SHA1). Secrets are
 * base32-encoded so they work with standard authenticator apps
 * (Google Authenticator, Authy, 1Password, …).
 */

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** Random base32 secret. Emits one base32 symbol per random byte (default 20
 *  symbols ≈ 100 bits of entropy) — compatible with authenticator apps. */
export function generateBase32Secret(bytes = 20): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  let out = '';
  for (const b of buf) out += BASE32_ALPHABET[b % 32];
  return out;
}

function base32Decode(input: string): Uint8Array {
  const clean = input.replace(/=+$/,'').replace(/\s/g, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

async function hmacSha1(keyBytes: Uint8Array, msg: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes as unknown as ArrayBuffer,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, msg as unknown as ArrayBuffer);
  return new Uint8Array(sig);
}

/** Compute the 6-digit TOTP code for a given counter (time step). */
async function totpForCounter(secret: string, counter: number): Promise<string> {
  const key = base32Decode(secret);
  const msg = new Uint8Array(8);
  // 64-bit big-endian counter.
  let c = counter;
  for (let i = 7; i >= 0; i--) { msg[i] = c & 0xff; c = Math.floor(c / 256); }
  const hmac = await hmacSha1(key, msg);
  const offset = hmac[hmac.length - 1] & 0x0f;
  const bin =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return (bin % 1_000_000).toString().padStart(6, '0');
}

/** Verify a submitted TOTP code, allowing ±`window` time steps for clock drift. */
export async function verifyTotp(secret: string, token: string, period = 30, window = 1): Promise<boolean> {
  const code = token.replace(/\D/g, '');
  if (code.length !== 6) return false;
  const counter = Math.floor(Date.now() / 1000 / period);
  for (let w = -window; w <= window; w++) {
    if (await totpForCounter(secret, counter + w) === code) return true;
  }
  return false;
}

/** Build the otpauth:// URI an authenticator app scans as a QR code. */
export function otpauthUri(secret: string, account: string, issuer = 'Caron'): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({ secret, issuer, algorithm: 'SHA1', digits: '6', period: '30' });
  return `otpauth://totp/${label}?${params.toString()}`;
}

/** SHA-256 hex (used to store recovery codes hashed, never in plaintext). */
export async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder();
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(input));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Generate N human-friendly recovery codes (plaintext). */
export function generateRecoveryCodes(n = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < n; i++) {
    const raw = generateBase32Secret(10).toLowerCase();
    codes.push(`${raw.slice(0, 5)}-${raw.slice(5, 10)}`);
  }
  return codes;
}
