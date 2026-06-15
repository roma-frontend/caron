import { NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/adminAuth';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../../convex/_generated/api';

function escapeCsv(value: unknown): string {
  const text = String(value ?? '');
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
}

export async function GET() {
  if (!(await requireAdminAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const url = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!url) return NextResponse.json({ error: 'No Convex URL' }, { status: 500 });
    const client = new ConvexHttpClient(url);
    const token = (await import('next/headers')).cookies().then((c) => c.get('auth-token')?.value);
    const orders = await client.query(api.orders.listAdmin, { sessionToken: await token ?? '' });
    const header = 'Համար,Անուն,Հեռախոս,Email,Հասցե,Գին,Ստատուս,Վճարում,Վճարման եղանակ ,Ամսաթիվ\n';
    const rows = orders.map((o: Record<string, unknown>) =>
      [
        o.orderNumber,
        o.customerName,
        o.customerPhone,
        o.customerEmail,
        o.shippingAddress,
        o.total,
        o.status,
        o.paymentStatus,
        o.paymentMethod || '',
        new Date(Number(o.createdAt)).toLocaleDateString(),
      ].map(escapeCsv).join(',')
    ).join('\n');
    return new NextResponse('\uFEFF' + header + rows, {
      headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename=orders.csv' },
    });
  } catch {
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
