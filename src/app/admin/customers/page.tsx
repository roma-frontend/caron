'use client';

import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Users, Mail, Phone } from 'lucide-react';
import { formatDateHy } from '@/lib/formatters';
import { useAuth } from '@/store/auth';

export default function AdminCustomersPage() {
  const { sessionToken } = useAuth();
  const orders = useQuery(api.orders.listAdmin, sessionToken ? { sessionToken } : 'skip');
  const [search, setSearch] = useState('');

  // Extract unique customers from orders
  const customersMap = new Map<
    string,
    {
      name: string;
      email: string;
      phone: string;
      ordersCount: number;
      totalSpent: number;
      lastOrder: number;
    }
  >();

  orders?.forEach((o) => {
    const key = o.customerEmail || o.customerPhone;
    const existing = customersMap.get(key);

    if (existing) {
      existing.ordersCount++;
      existing.totalSpent += o.total;

      if (o.createdAt > existing.lastOrder) {
        existing.lastOrder = o.createdAt;
      }
    } else {
      customersMap.set(key, {
        name: o.customerName,
        email: o.customerEmail,
        phone: o.customerPhone,
        ordersCount: 1,
        totalSpent: o.total,
        lastOrder: o.createdAt,
      });
    }
  });

  const customers = Array.from(customersMap.values()).sort(
    (a, b) => b.lastOrder - a.lastOrder
  );

  const filtered = customers.filter((c) => {
    if (!search) return true;

    const q = search.toLowerCase();

    return (
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.phone.includes(q)
    );
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">
          {'Հաճախորդներ'}
        </h1>

        <p className="text-muted-foreground">
          {customers.length} {'հաճախորդ'}
        </p>
      </div>

      <div className="mb-6 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

        <Input
          placeholder={'Որոնել հաճախորդ...'}
          className="h-9 pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        {filtered.map((c, i) => (
          <Card key={i}>
            <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>

              <div className="flex-1 min-w-0 w-full sm:w-auto">
                <p className="font-medium truncate">
                  {c.name}
                </p>

                <div className="flex flex-col sm:flex-row sm:flex-wrap gap-1 sm:gap-3 text-xs text-muted-foreground mt-0.5">
                  <span className="flex items-center gap-1 truncate">
                    <Mail className="h-3 w-3 shrink-0" />
                    <span className="truncate">{c.email}</span>
                  </span>

                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3 shrink-0" />
                    {c.phone}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0 w-full sm:w-auto justify-start sm:justify-end">
                <div className="text-center">
                  <p className="text-lg font-bold">
                    {c.ordersCount}
                  </p>

                  <p className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {'պատվեր'}
                  </p>
                </div>

                <div className="text-center">
                  <p className="text-lg font-bold text-primary">
                    {(c.totalSpent / 1000).toFixed(0)}k
                  </p>

                  <p className="text-[10px] text-muted-foreground">
                    {'֏'}
                  </p>
                </div>

                <div className="text-center hidden sm:block">
                  <p className="text-xs whitespace-nowrap">
                    {formatDateHy(c.lastOrder)}
                  </p>

                  <p className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {'վերջին'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <Users className="h-16 w-16 text-muted-foreground/30" />

          <p className="text-muted-foreground">
            {'Հաճախորդներ չեն գտնվել'}
          </p>
        </div>
      )}
    </div>
  );
}