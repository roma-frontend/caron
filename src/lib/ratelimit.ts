import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Lazy singleton — only instantiated when env vars are present
let _ratelimit: Ratelimit | null = null;

function getRatelimit(): Ratelimit | null {
  if (_ratelimit) return _ratelimit;
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  _ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(5, '60 s'),
    prefix: 'autoparts:rl',
  });
  return _ratelimit;
}

export async function checkRateLimit(ip: string): Promise<{ allowed: boolean; reset: number }> {
  const rl = getRatelimit();
  if (!rl) return { allowed: true, reset: 0 }; // no Redis configured — allow
  const { success, reset } = await rl.limit(ip);
  return { allowed: success, reset };
}
