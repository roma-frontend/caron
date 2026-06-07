import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api';

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!;

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }
    const client = new ConvexHttpClient(CONVEX_URL);
    const result = await client.mutation(api.newsletter.subscribe, { email });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
