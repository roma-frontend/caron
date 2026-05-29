'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Car, Search } from 'lucide-react';
import { CAR_DATA, CAR_BRANDS } from '@/lib/cars';
import { useVehicleStore } from '@/store/vehicle';

export function VehicleSelector({ className }: { className?: string }) {
  const router = useRouter();
  const setVehicle = useVehicleStore((s) => s.setVehicle);
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');

  const models = brand ? Object.keys(CAR_DATA[brand] ?? {}) : [];
  const years = brand && model ? (CAR_DATA[brand]?.[model] ?? []) : [];

  const go = () => {
    if (!brand) return;
    setVehicle({ brand, model, year });
    const q = [brand, model, year].filter(Boolean).join(' ');
    router.push(`/products?q=${encodeURIComponent(q)}`);
  };

  return (
    <div
      className={`w-full rounded-2xl border bg-background/80 p-4 backdrop-blur-md sm:p-5 ${className ?? ''}`}
      style={{ borderColor: 'var(--landing-card-border)', boxShadow: 'var(--shadow-lg)' }}
    >
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <Car className="h-4 w-4 text-primary" /> Ընտրեք ձեր ավտոմեքենան
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
        <Select value={brand} onValueChange={(v) => { setBrand(v ?? ''); setModel(''); setYear(''); }}>
          <SelectTrigger className="h-11" aria-label="Մակնիշ"><SelectValue placeholder="Մակնիշ" /></SelectTrigger>
          <SelectContent>{CAR_BRANDS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={model} onValueChange={(v) => { setModel(v ?? ''); setYear(''); }} disabled={!brand}>
          <SelectTrigger className="h-11" aria-label="Մոդել"><SelectValue placeholder="Մոդել" /></SelectTrigger>
          <SelectContent>{models.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={year} onValueChange={(v) => setYear(v ?? '')} disabled={!model}>
          <SelectTrigger className="h-11" aria-label="Տարի"><SelectValue placeholder="Տարի" /></SelectTrigger>
          <SelectContent>{years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
        </Select>
        <Button onClick={go} disabled={!brand} size="lg" className="h-11 gap-2">
          <Search className="h-4 w-4" /> Գտնել
        </Button>
      </div>
    </div>
  );
}
