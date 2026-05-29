import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { to, orderNumber, total, bankAccount, bankName } = await req.json();

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'Email not configured' }, { status: 500 });
  }

  const html = `
    <h2>Պատվեր #${orderNumber}</h2>
    <p>Ընդհատված պատվեր: <strong>${total} ֏</strong></p>
    <h3>Բանկային հաշիվ:</h3>
    <p>Բանկ: ${bankName}<br/>Հաշիվ: <code>${bankAccount}</code></p>
    <p></p>
  `;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'Caroon <noreply@caroon.am>', to, subject: `Պատվեր #${orderNumber}`, html }),
  });

  if (!res.ok) return NextResponse.json({ error: 'Failed to send' }, { status: 500 });
  return NextResponse.json({ success: true });
}
