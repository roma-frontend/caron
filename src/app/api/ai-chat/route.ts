import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import { buildSystemPrompt, type UserContext } from '@/lib/aiAssistant';
import { checkRateLimit } from '@/lib/ratelimit';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api';

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
    const { message, history } = await req.json() as {
      message: string;
      history?: { role: 'user' | 'assistant'; content: string }[];
    };

    if (!message) {
      return NextResponse.json({ error: 'Missing message' }, { status: 400 });
    }

    if (typeof message !== 'string' || message.length > 2000) {
      return NextResponse.json({ error: 'Message too long' }, { status: 400 });
    }

    const token = req.cookies.get('auth-token')?.value;
    let user: UserContext = { name: 'Guest', email: '', role: 'guest' };
    if (token && process.env.NEXT_PUBLIC_CONVEX_URL) {
      const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
      const me = await client.query(api.auth.me, { sessionToken: token }).catch(() => null);
      if (me) {
        user = {
          name: me.name,
          email: me.email,
          role: me.role === 'admin' ? 'admin' : 'customer',
        };
      }
    }

    const systemPrompt = buildSystemPrompt(user);

    const messages = [
      ...(history || []).slice(-10).filter((m) => typeof m.content === 'string' && (m.role === 'user' || m.role === 'assistant')).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content.slice(0, 2000),
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
