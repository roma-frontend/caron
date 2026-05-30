import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { buildSystemPrompt, type UserContext } from '@/lib/aiAssistant';

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { message, user, history } = await req.json() as {
      message: string;
      user: UserContext;
      history?: { role: 'user' | 'assistant'; content: string }[];
    };

    if (!message || !user) {
      return NextResponse.json({ error: 'Missing message or user' }, { status: 400 });
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
      model: google('gemini-2.0-flash'),
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
