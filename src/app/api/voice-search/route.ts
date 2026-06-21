import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/ratelimit';

const MAX_BYTES = 15 * 1024 * 1024; // 15MB
const GROQ_TRANSCRIBE_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';

export async function POST(req: NextRequest) {
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 500 });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? 'unknown';
  const { allowed, reset } = await checkRateLimit(`voice-search:${ip}`);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(reset) } });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof Blob) || file.size === 0) {
    return NextResponse.json({ error: 'No audio' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Audio too large' }, { status: 413 });
  }

  // Forward to Groq Whisper (OpenAI-compatible). Language is auto-detected so
  // shoppers can speak Armenian, Russian or English.
  const groqForm = new FormData();
  groqForm.append('file', file, 'audio.webm');
  groqForm.append('model', 'whisper-large-v3-turbo');
  groqForm.append('response_format', 'json');
  groqForm.append('temperature', '0');

  try {
    const res = await fetch(GROQ_TRANSCRIBE_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: groqForm,
    });
    if (!res.ok) {
      console.error('[Voice Search] groq error', res.status, await res.text().catch(() => ''));
      return NextResponse.json({ error: 'Transcription failed' }, { status: 502 });
    }
    const data = (await res.json()) as { text?: string };
    return NextResponse.json({ text: String(data.text ?? '').trim() });
  } catch (error) {
    console.error('[Voice Search]', error);
    return NextResponse.json({ error: 'Transcription failed' }, { status: 502 });
  }
}
