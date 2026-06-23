import { NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/adminAuth';
import { checkRateLimit } from '@/lib/ratelimit';
import { invoiceEmail } from '@/lib/emailTemplates';

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const { allowed, reset } = await checkRateLimit(`email-invoice:${ip}`);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(reset) } });
  }

  if (!(await requireAdminAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'Email not configured' }, { status: 500 });
  }

  let body: { to?: string; orderNumber?: string; total?: string; bankAccount?: string; bankName?: string; customerName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { to, orderNumber, total, bankAccount, bankName, customerName } = body;
  if (!to || !orderNumber || !total) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const { subject, html } = invoiceEmail({ to, orderNumber, total, bankName, bankAccount, customerName });

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || 'Caron <noreply@caron.am>',
      to,
      subject,
      html,
    }),
  });

  if (!res.ok) return NextResponse.json({ error: 'Failed to send' }, { status: 500 });
  return NextResponse.json({ success: true });
}
