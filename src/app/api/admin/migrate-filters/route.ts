import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../../convex/_generated/api';
import { requireAdminAuth } from '@/lib/adminAuth';

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!;

export async function POST(req: NextRequest) {
  try {
    const isAdmin = await requireAdminAuth();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionToken } = await req.json();

    if (!sessionToken) {
      return NextResponse.json({ error: 'Missing sessionToken' }, { status: 401 });
    }

    const client = new ConvexHttpClient(CONVEX_URL);
    const result = await client.mutation(api.filters.runMigrateFilterAttributeKeysToId, {
      sessionToken,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 400 });
  }
}
