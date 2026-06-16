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
      '\u0540\u0561\u0574\u0561\u0580',
      '\u0531\u0574\u057D\u0561\u0569\u056B\u057E',
      '\u0531\u0576\u0578\u0582\u0576',
      '\u0540\u0565\u057C\u0561\u056D\u0578\u057D',
      'Email',
      '\u0540\u0561\u057D\u0581\u0565',
      '\u054D\u057F\u0561\u057F\u0578\u0582\u057D',
      '\u054E\u0573\u0561\u0580\u0578\u0582\u0574',
      '\u054E\u0573\u0561\u0580\u0574\u0561\u0576 \u0565\u0572\u0561\u0576\u0561\u056F',
      '\u0531\u057A\u0580\u0561\u0576\u0584\u0576\u0565\u0580',
      '\u0531\u057C\u0561\u0584\u0578\u0582\u0574',
      '\u0538\u0576\u0564\u0561\u0574\u0565\u0576\u0568',
      '\u0549\u0565\u0572\u0561\u0580\u056F\u0574\u0561\u0576 \u057A\u0561\u057F\u0573\u0561\u057C',
      '\u0544\u0565\u056F\u0576\u0561\u0562\u0561\u0576\u0578\u0582\u0569\u0575\u0578\u0582\u0576',
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

    return new NextResponse('\uFEFF' + header + rows, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename=orders-${new Date().toISOString().slice(0, 10)}.csv`,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
