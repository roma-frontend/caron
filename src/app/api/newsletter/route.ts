import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api';
import { checkRateLimit } from '@/lib/ratelimit';

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!;

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? 'unknown';
    const { allowed } = await checkRateLimit(`newsletter:${ip}`);
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { email } = await req.json();
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }
    const client = new ConvexHttpClient(CONVEX_URL);
    const result = await client.mutation(api.newsletter.subscribe, { email });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
