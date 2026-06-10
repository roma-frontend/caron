import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../../convex/_generated/api';

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!;

export async function POST(req: NextRequest) {
  try {
    const { sessionToken } = await req.json();

    if (!sessionToken) {
      return NextResponse.json({ error: 'Missing sessionToken' }, { status: 401 });
    }

    const client = new ConvexHttpClient(CONVEX_URL);
    const result = await client.mutation(api.filters.runMigrateFilterAttributeKeysToId, {
      sessionToken,
    });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// Unauthenticated one-time migration endpoint (for system setup)
export async function GET(req: NextRequest) {
  try {
    const client = new ConvexHttpClient(CONVEX_URL);
    
    // Build mapping of slug -> _id for all filterDefinitions
    const filterDefs = await client.query(api.filters.listAll);
    const slugToId = new Map(filterDefs.map((f: any) => [f.slug, f._id]));

    const products = await client.query(api.products.listAll);
    let updated = 0;

    for (const product of products) {
      const attrs = (product.attributes ?? {}) as Record<string, unknown>;
      const newAttrs: Record<string, unknown> = {};
      let changed = false;

      for (const [key, value] of Object.entries(attrs)) {
        const filterId = slugToId.get(key);
        if (filterId) {
          newAttrs[filterId] = value;
          changed = true;
        } else {
          newAttrs[key] = value;
        }
      }

      if (changed) {
        await client.mutation(api.products.migrateAttributeKeys, {
          productId: product._id,
          newAttributes: newAttrs,
        });
        updated++;
      }
    }

    return NextResponse.json({ 
      success: true,
      updated, 
      message: `Գծանցվել են ${updated} ապրանքներ` 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

