import { NextRequest, NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import { z } from 'zod';
import { requireAdminAuth } from '@/lib/adminAuth';
import { checkRateLimit } from '@/lib/ratelimit';

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

const schema = z.object({
  description: z.string().describe('Marketing product description in Armenian, 2-4 sentences'),
  seoTitle: z.string().describe('SEO title in Armenian, max 60 characters'),
  seoDescription: z.string().describe('SEO meta description in Armenian, max 160 characters'),
});

export async function POST(req: NextRequest) {
  if (!(await requireAdminAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 500 });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const { allowed } = await checkRateLimit(`ai-generate:${ip}`);
  if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  let body: { name?: string; category?: string; brand?: string; attributes?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const name = (body.name ?? '').toString().trim();
  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });

  const attrs = body.attributes && typeof body.attributes === 'object'
    ? Object.entries(body.attributes)
        .filter(([, v]) => v != null && v !== '')
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
        .join('; ')
    : '';

  try {
    const { object } = await generateObject({
      model: groq('llama-3.3-70b-versatile'),
      schema,
      prompt: [
        'Դու ավտոպահեստամասերի առցանց խանութի կոնտենտ-մասնագետ ես (Caron, Հայաստան)։',
        'Ստեղծիր գրավիչ, ճշգրիտ տեքստ հայերենով հետևյալ ապրանքի համար։',
        'Մի հորինիր տեխնիկական բնութագրեր, որոնք տրված չեն։',
        '',
        `Անվանում: ${name}`,
        body.category ? `Կատեգորիա: ${body.category}` : '',
        body.brand ? `Ապրանքանիշ: ${body.brand}` : '',
        attrs ? `Բնութագրեր: ${attrs}` : '',
      ].filter(Boolean).join('\n'),
    });
    return NextResponse.json(object);
  } catch (error) {
    console.error('[AI Generate]', error);
    return NextResponse.json({ error: 'AI generation failed' }, { status: 500 });
  }
}
