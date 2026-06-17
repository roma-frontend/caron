import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/adminAuth';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../../convex/_generated/api';

function escapeCsv(value: unknown): string {
  const text = String(value ?? '');
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
}

export async function GET(req: NextRequest) {
  if (!(await requireAdminAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const url = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!url) return NextResponse.json({ error: 'No Convex URL' }, { status: 500 });

    const { searchParams } = req.nextUrl;
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const paymentStatus = searchParams.get('paymentStatus');
    const paymentMethod = searchParams.get('paymentMethod');
    const status = searchParams.get('status');

    const client = new ConvexHttpClient(url);
    const token = (await import('next/headers')).cookies().then((c) => c.get('auth-token')?.value);
    const orders = await client.query(api.orders.listAdmin, { sessionToken: (await token) ?? '' });

    let filtered = orders as Array<Record<string, unknown>>;
    if (from) filtered = filtered.filter((o) => Number(o.createdAt) >= Number(from));
    if (to) filtered = filtered.filter((o) => Number(o.createdAt) <= Number(to));
    if (paymentStatus) filtered = filtered.filter((o) => o.paymentStatus === paymentStatus);
    if (paymentMethod) filtered = filtered.filter((o) => o.paymentMethod === paymentMethod);
    if (status) filtered = filtered.filter((o) => o.status === status);

    const header = [
      'Համար',
      'Ամսաթիվ',
      'Անուն',
      'Հեռախոս',
      'Email',
      'Հասցե',
      'Ստատուս',
      'Վճարում',
      'Վճարման եղանակ',
      'Ապրանքներ',
      'Առաքում',
      'Ընդամենը',
      'Չեղարկման պատճառ',
      'Մեկնաբանություն',
    ].map(escapeCsv).join(',') + '\n';

    const rows = filtered.map((o) =>
      [
        o.orderNumber,
        new Date(Number(o.createdAt)).toLocaleString('hy-AM'),
        o.customerName,
        o.customerPhone,
        o.customerEmail,
        o.shippingAddress,
        o.status,
        o.paymentStatus,
        o.paymentMethod || '',
        Number(o.subtotal),
        Number(o.shipping),
        Number(o.total),
        o.cancelReason || '',
        o.notes || '',
      ].map(escapeCsv).join(',')
    ).join('\n');

    return new NextResponse('﻿' + header + rows, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename=orders-${new Date().toISOString().slice(0, 10)}.csv`,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
