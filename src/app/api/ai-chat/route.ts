import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import { buildSystemPrompt, type UserContext } from '@/lib/aiAssistant';
import { checkRateLimit } from '@/lib/ratelimit';

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? 'unknown';
  const { allowed, reset } = await checkRateLimit(`ai-chat:${ip}`);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(reset) } });
  }

  try {
    const { message, user, history } = await req.json() as {
      message: string;
      user: UserContext;
      history?: { role: 'user' | 'assistant'; content: string }[];
    };

    if (!message || !user) {
      return NextResponse.json({ error: 'Missing message or user' }, { status: 400 });
    }

    if (typeof message !== 'string' || message.length > 2000) {
      return NextResponse.json({ error: 'Message too long' }, { status: 400 });
    }

    const systemPrompt = buildSystemPrompt(user);

    const messages = [
      ...(history || []).slice(-10).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: message },
    ];

    const { text } = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      system: systemPrompt,
      messages,
    });

    return NextResponse.json({ reply: text });
  } catch (error) {
    console.error('[AI Chat]', error);
    return NextResponse.json(
      { error: 'AI service unavailable' },
      { status: 500 },
    );
  }
}
