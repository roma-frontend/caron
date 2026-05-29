import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { name, phone, email, message } = await req.json();

  if (!name || !phone || !message) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  // Send Telegram notification to admin
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (botToken && chatId) {
    const text = `📩 *Նոր հաղորդագրություն!*\n\n👤 *Անուն:* ${name}\n📞 *Հեռախոս:* ${phone}\n📧 *Էլ. փոստ:* ${email || '—'}\n\n💬 *Հաղորդագրություն:*\n${message}`;

    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
    });
  }

  return NextResponse.json({ success: true });
}
