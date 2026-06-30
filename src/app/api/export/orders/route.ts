import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/adminAuth';
import { ConvexHttpClient } from 'convex/browser';
import { XLSX, styleSheet } from '@/lib/xlsxStyle';
import { api } from '../../../../../convex/_generated/api';

export const runtime = 'nodejs';

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
      'Համար', 'Ամսաթիվ', 'Անուն', 'Հեռախոս', 'Email', 'Հասցե',
      'Ստատուս', 'Վճարում', 'Վճարման եղանակ', 'Առաջին գումար', 'Առաքում', 'Ընդամենը',
      'Չեղարկման պատճառ', 'Մեկնաբանություն',
    ];

    const dataRows = filtered.map((o) => [
      String(o.orderNumber ?? ''),
      new Date(Number(o.createdAt)).toLocaleString('hy-AM'),
      String(o.customerName ?? ''),
      String(o.customerPhone ?? ''),
      String(o.customerEmail ?? ''),
      String(o.shippingAddress ?? ''),
      String(o.status ?? ''),
      String(o.paymentStatus ?? ''),
      String(o.paymentMethod || ''),
      Number(o.subtotal) || 0,
      Number(o.shipping) || 0,
      Number(o.total) || 0,
      String(o.cancelReason || ''),
      String(o.notes || ''),
    ]);

    const ws = XLSX.utils.aoa_to_sheet([header, ...dataRows]);
    styleSheet(ws, {
      widths: [14, 18, 20, 16, 24, 30, 12, 12, 16, 14, 12, 14, 20, 24],
      moneyCols: [9, 10, 11],
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Orders');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=orders-${new Date().toISOString().slice(0, 10)}.xlsx`,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
