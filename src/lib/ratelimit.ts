import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Lazy singletons — only instantiated when env vars are present
let _ratelimit: Ratelimit | null = null;
let _adminRatelimit: Ratelimit | null = null;

function getRatelimit(): Ratelimit | null {
  if (_ratelimit) return _ratelimit;
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  _ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(5, '60 s'),
    prefix: 'Caron:rl',
  });
  return _ratelimit;
}

// Higher-volume limiter for authenticated admin actions (e.g. bulk product
// image uploads). Admins are already auth-gated, so the public 5/60s limit is
// far too strict for them; this only guards against runaway loops/abuse.
function getAdminRatelimit(): Ratelimit | null {
  if (_adminRatelimit) return _adminRatelimit;
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  _adminRatelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(100, '60 s'),
    prefix: 'Caron:rl:admin',
  });
  return _adminRatelimit;
}

export async function checkRateLimit(ip: string): Promise<{ allowed: boolean; reset: number }> {
  const rl = getRatelimit();
  if (!rl) return { allowed: true, reset: 0 }; // no Redis configured — allow
  const { success, reset } = await rl.limit(ip);
  return { allowed: success, reset };
}

export async function checkAdminRateLimit(ip: string): Promise<{ allowed: boolean; reset: number }> {
  const rl = getAdminRatelimit();
  if (!rl) return { allowed: true, reset: 0 }; // no Redis configured — allow
  const { success, reset } = await rl.limit(ip);
  return { allowed: success, reset };
}
