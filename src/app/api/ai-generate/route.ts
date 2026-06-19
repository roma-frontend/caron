import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import { requireAdminAuth } from '@/lib/adminAuth';
import { checkRateLimit } from '@/lib/ratelimit';

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

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

  const prompt = [
    'Դու ավտոպահեստամասերի առցանց խանութի կոնտենտ-մասնագետ ես (Caron, Հայաստան)։',
    'Ստեղծիր գրավիչ, ճշգրիտ տեքստ հայերենով հետևյալ ապրանքի համար։ Մի հորինիր տեխնիկական բնութագրեր։',
    '',
    `Անվանում: ${name}`,
    body.category ? `Կատեգորիա: ${body.category}` : '',
    body.brand ? `Ապրանքանիշ: ${body.brand}` : '',
    attrs ? `Բնութագրեր: ${attrs}` : '',
    '',
    'Պատասխանիր ՄԻԱՅՆ վավեր JSON-ով, առանց markdown-ի, հետևյալ ձևաչափով՝',
    '{"description":"2-4 նախադասություն","seoTitle":"մինչև 60 նիշ","seoDescription":"մինչև 160 նիշ"}',
  ].filter(Boolean).join('\n');

  try {
    const { text } = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      prompt,
      temperature: 0.6,
    });

    // Extract the JSON object even if the model wraps it in prose/markdown.
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON in response');
    const parsed = JSON.parse(match[0]) as { description?: string; seoTitle?: string; seoDescription?: string };

    return NextResponse.json({
      description: String(parsed.description ?? '').trim(),
      seoTitle: String(parsed.seoTitle ?? '').trim().slice(0, 80),
      seoDescription: String(parsed.seoDescription ?? '').trim().slice(0, 200),
    });
  } catch (error) {
    console.error('[AI Generate]', error);
    return NextResponse.json({ error: 'AI generation failed' }, { status: 500 });
  }
}
