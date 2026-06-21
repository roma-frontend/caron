import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import { checkRateLimit } from '@/lib/ratelimit';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api';

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

// Groq multimodal model that supports image input (verified available on the key).
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

// ~6MB cap on the incoming data URL (client downscales before sending).
const MAX_DATA_URL_LENGTH = 6 * 1024 * 1024;

type Detected = { brand: string; partType: string; partTypeHy: string; codes: string[] };

function parseDetected(text: string): Detected | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const o = JSON.parse(match[0]) as Partial<Detected>;
    return {
      brand: String(o.brand ?? '').trim(),
      partType: String(o.partType ?? '').trim(),
      partTypeHy: String(o.partTypeHy ?? '').trim(),
      codes: Array.isArray(o.codes) ? o.codes.map((c) => String(c).trim()).filter(Boolean) : [],
    };
  } catch {
    return null;
  }
}

/** Build search candidates in descending priority (most distinctive first). */
function buildCandidates(d: Detected): string[] {
  const out: string[] = [];
  const push = (s: string) => { const v = s.trim(); if (v && !out.includes(v)) out.push(v); };
  // Part numbers are the strongest signal (match SKU / OEM numbers exactly).
  for (const c of d.codes) push(c);
  if (d.brand && d.partTypeHy) push(`${d.brand} ${d.partTypeHy}`);
  if (d.brand && d.partType) push(`${d.brand} ${d.partType}`);
  push(d.partTypeHy);
  push(d.brand);
  push(d.partType);
  return out.slice(0, 6);
}

export async function POST(req: NextRequest) {
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 500 });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? 'unknown';
  const { allowed, reset } = await checkRateLimit(`image-search:${ip}`);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(reset) } });
  }

  let body: { image?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const image = (body.image ?? '').toString();
  if (!image.startsWith('data:image/')) {
    return NextResponse.json({ error: 'Invalid image' }, { status: 400 });
  }
  if (image.length > MAX_DATA_URL_LENGTH) {
    return NextResponse.json({ error: 'Image too large' }, { status: 413 });
  }

  // 1) Vision: identify the auto part from the photo.
  let detected: Detected | null = null;
  try {
    const { text } = await generateText({
      model: groq(VISION_MODEL),
      temperature: 0,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: [
              'You analyze a photo of a car spare part for an Armenian auto-parts shop.',
              'Identify the part and read any printed text/part numbers (OCR).',
              'Reply with ONLY valid JSON, no markdown, in this exact shape:',
              '{"brand":"","partType":"","partTypeHy":"","codes":[]}',
              '- brand: manufacturer brand if visible (Latin), else "".',
              '- partType: part type in English (e.g. "Oil Filter", "Brake Pads").',
              '- partTypeHy: the same part type in Armenian (e.g. "Յուղի ֆիլտր", "Արգելակման կոճ").',
              '- codes: array of part/OEM numbers exactly as printed (keep digits, letters, spaces).',
              'If you cannot identify a part, return all empty values.',
            ].join('\n'),
          },
          { type: 'image', image },
        ],
      }],
    });
    detected = parseDetected(text);
  } catch (error) {
    console.error('[Image Search] vision error', error);
    return NextResponse.json({ error: 'Vision analysis failed' }, { status: 502 });
  }

  if (!detected) {
    return NextResponse.json({ error: 'Could not analyze image' }, { status: 422 });
  }

  const candidates = buildCandidates(detected);
  if (candidates.length === 0) {
    return NextResponse.json({ query: '', detected, found: 0, candidates: [] });
  }

  // 2) Resolve the best candidate against the live catalog (pick the first that
  //    actually returns products). Falls back to the most descriptive term.
  let query = candidates[0];
  let found = 0;
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (convexUrl) {
    const client = new ConvexHttpClient(convexUrl);
    for (const c of candidates) {
      try {
        const res = await client.query(api.products.list, { search: c, limit: 8 });
        if (Array.isArray(res) && res.length > 0) {
          query = c;
          found = res.length;
          break;
        }
      } catch {
        // ignore and try next candidate
      }
    }
    // Nothing matched: prefer a human-friendly term over a raw code.
    if (found === 0) {
      query = detected.partTypeHy || (detected.brand && detected.partType ? `${detected.brand} ${detected.partType}` : candidates[0]);
    }
  }

  return NextResponse.json({ query, detected, found, candidates });
}
