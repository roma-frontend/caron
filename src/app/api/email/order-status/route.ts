import { NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/adminAuth';
import { checkRateLimit } from '@/lib/ratelimit';
import { orderStatusEmail, type OrderStatusInput } from '@/lib/emailTemplates';

const VALID_STATUSES = new Set(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']);

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const { allowed, reset } = await checkRateLimit(`email-order-status:${ip}`);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(reset) } });
  }

  if (!(await requireAdminAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'Email not configured' }, { status: 500 });
  }

  let body: Partial<OrderStatusInput>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { to, orderNumber, status, customerName } = body;
  if (!to || !orderNumber || !status || !VALID_STATUSES.has(status)) {
    return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 });
  }
  // Don't email synthetic Telegram placeholder addresses.
  if (to.endsWith('@telegram.local')) {
    return NextResponse.json({ success: true, skipped: 'no-email' });
  }

  const { subject, html } = orderStatusEmail({ to, orderNumber, status, customerName });

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: process.env.EMAIL_FROM || 'Caron <noreply@caron.am>', to, subject, html }),
  });

  if (!res.ok) return NextResponse.json({ error: 'Failed to send' }, { status: 500 });
  return NextResponse.json({ success: true });
}
