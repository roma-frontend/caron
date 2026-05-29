'use client';

import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Package, Clock, CheckCircle, Truck, MapPin } from 'lucide-react';
import { formatPrice, formatDateHy } from '@/lib/formatters';

const STEPS = [
  { key: 'pending', label: 'Սպասվում է', icon: Clock },
  { key: 'confirmed', label: 'Հաստատվել է', icon: CheckCircle },
  { key: 'processing', label: 'Կատարվում է', icon: Package },
  { key: 'shipped', label: 'Ուղարկվել է', icon: Truck },
  { key: 'delivered', label: 'Առաքվել է', icon: MapPin },
];

export default function OrderStatusPage() {
  const [orderNum, setOrderNum] = useState('');
  const [searchNum, setSearchNum] = useState('');
  const orders = useQuery(api.orders.listAdmin, {});
  const order = orders?.find((o) => o.orderNumber === searchNum);

  const handleSearch = () => { if (orderNum.trim()) setSearchNum(orderNum.trim().toUpperCase()); };

  const currentStep = order ? STEPS.findIndex((s) => s.key === order.status) : -1;

  return (
    <div className="mx-auto" style={{ maxWidth: 'var(--container-max)', paddingInline: 'var(--space-container)', paddingBlock: 'var(--space-8)' }}>
      <div className="mb-10 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <Package className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">{'Պատվերի կարգավիճակ'}</h1>
        <p className="mt-2 text-muted-foreground">{'Ստուգեք ձեր պատվերի կարգավիճակը'}</p>
      </div>

      {/* Search */}
      <div className="mx-auto max-w-md mb-10">
        <div className="flex gap-2">
          <Input value={orderNum} onChange={(e) => setOrderNum(e.target.value)} placeholder="ORD-XXXXXXX"
            className="h-12 text-center font-mono text-lg" onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
          <Button onClick={handleSearch} size="lg" className="h-12 gap-2 px-6">
            <Search className="h-5 w-5" /> {'Որոնել'}
          </Button>
        </div>
      </div>

      {/* Result */}
      {searchNum && !order && (
        <div className="text-center py-10">
          <p className="text-muted-foreground">{'Պատվերը չի գտնվել'}</p>
        </div>
      )}

      {order && (
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Progress */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="font-mono font-bold">{order.orderNumber}</p>
                  <p className="text-xs text-muted-foreground">{formatDateHy(order.createdAt)}</p>
                </div>
                <span className="text-xl font-bold text-primary">{formatPrice(order.total)}</span>
              </div>

              {/* Steps */}
              {order.status !== 'cancelled' ? (
                <div className="flex items-center justify-between">
                  {STEPS.map((step, i) => {
                    const done = i <= currentStep;
                    const active = i === currentStep;
                    return (
                      <div key={step.key} className="flex flex-col items-center gap-1.5 flex-1">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${done ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'} ${active ? 'ring-4 ring-primary/20' : ''}`}>
                          <step.icon className="h-5 w-5" />
                        </div>
                        <span className={`text-[10px] text-center ${done ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>{step.label}</span>
                        {i < STEPS.length - 1 && <div className={`absolute h-0.5 w-full ${done ? 'bg-primary' : 'bg-muted'}`} style={{ display: 'none' }} />}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <Badge variant="destructive" className="text-sm">{'Չեղյալ'}</Badge>
              )}
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardContent className="p-6">
              <h3 className="mb-4 font-semibold">{'Պատվերի տարրեր'}</h3>
              <div className="space-y-3">
                {order.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.quantity} x {formatPrice(item.price)}</p>
                    </div>
                    <span className="font-bold">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
