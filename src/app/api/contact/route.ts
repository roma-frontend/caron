import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/ratelimit';
import { verifyTurnstile } from '@/lib/turnstile';

// Escape special chars for Telegram MarkdownV2
function escapeMd(str: string): string {
  return str.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
}

export async function POST(req: NextRequest) {
  // Rate limit by IP
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1';
  const { allowed, reset } = await checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)) },
    });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const name = String(body.name ?? '').trim().slice(0, 100);
  const phone = String(body.phone ?? '').trim().slice(0, 30);
  const email = String(body.email ?? '').trim().slice(0, 200);
  const message = String(body.message ?? '').trim().slice(0, 2000);

  if (!name || !phone || !message) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Bot check (no-op until TURNSTILE_SECRET_KEY is configured).
  if (!(await verifyTurnstile(body.turnstileToken, ip))) {
    return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (botToken && chatId) {
    // Use MarkdownV2 with properly escaped user input
    const text = `📩 *Նոր հաղորդագրություն\\!*\n\n👤 *Անուն:* ${escapeMd(name)}\n📞 *Հեռախոս:* ${escapeMd(phone)}\n📧 *Էլ\\. փոստ:* ${escapeMd(email || '—')}\n\n💬 *Հաղորդագրություն:*\n${escapeMd(message)}`;

    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'MarkdownV2' }),
    });
  }

  return NextResponse.json({ success: true });
}
