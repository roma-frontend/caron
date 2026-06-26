import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import { requireAdminAuth } from '@/lib/adminAuth';
import { checkRateLimit } from '@/lib/ratelimit';
import { dictTranslateName } from '../../../../convex/lib/translateDict';

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Translate Armenian product text to Russian and English.
 * Admin-only. Returns `{ nameRu, nameEn, descriptionRu, descriptionEn }`.
 * Brand names, model codes, sizes and units are kept verbatim.
 */
export async function POST(req: NextRequest) {
  if (!(await requireAdminAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 500 });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const { allowed } = await checkRateLimit(`ai-translate:${ip}`);
  if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  let body: { name?: string; description?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const name = (body.name ?? '').toString().trim();
  const description = (body.description ?? '').toString().trim();
  if (!name && !description) {
    return NextResponse.json({ error: 'Nothing to translate' }, { status: 400 });
  }

  // Deterministic dictionary first — reliable & instant for formulaic catalog
  // names. If it fully covers the name and there's no free-text description,
  // skip the (unreliable) LLM entirely.
  const dict = dictTranslateName(name);
  if (name && dict.complete && !description) {
    return NextResponse.json({
      nameRu: dict.ru,
      nameEn: dict.en,
      descriptionRu: '',
      descriptionEn: '',
    });
  }

  const prompt = [
    'You are a professional translator for an auto-parts online store (Armenia).',
    'Translate the given Armenian product fields into Russian and English.',
    'Rules:',
    '- Keep brand names, model codes, article numbers, sizes and units unchanged (e.g. "Dep Sun 26\\" 650mm", "5W-30", "H7", "R16").',
    '- Translate only the meaningful Armenian words; do not invent new facts.',
    '- Keep it concise and natural. Return the same general meaning.',
    '- If a field is empty, return an empty string for it.',
    '',
    `name (hy): ${name || '(empty)'}`,
    `description (hy): ${description || '(empty)'}`,
    '',
    'Respond with ONLY valid JSON, no markdown, in this exact shape:',
    '{"nameRu":"","nameEn":"","descriptionRu":"","descriptionEn":""}',
  ].join('\n');

  try {
    const { text } = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      prompt,
      temperature: 0.2,
    });

    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON in response');
    const parsed = JSON.parse(match[0]) as {
      nameRu?: string; nameEn?: string; descriptionRu?: string; descriptionEn?: string;
    };

    return NextResponse.json({
      nameRu: name && dict.complete ? dict.ru : String(parsed.nameRu ?? '').trim(),
      nameEn: name && dict.complete ? dict.en : String(parsed.nameEn ?? '').trim(),
      descriptionRu: String(parsed.descriptionRu ?? '').trim(),
      descriptionEn: String(parsed.descriptionEn ?? '').trim(),
    });
  } catch (error) {
    console.error('[AI Translate]', error);
    return NextResponse.json({ error: 'AI translation failed' }, { status: 500 });
  }
}
