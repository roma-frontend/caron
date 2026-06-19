'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Car, Search, Check, X, Plus } from 'lucide-react';
import { CAR_DATA, CAR_BRANDS } from '@/lib/cars';
import { useVehicleStore, vehicleKey, type Vehicle } from '@/store/vehicle';

export function VehicleSelector({ className }: { className?: string }) {
  const router = useRouter();
  const setVehicle = useVehicleStore((s) => s.setVehicle);
  const addVehicle = useVehicleStore((s) => s.addVehicle);
  const selectVehicle = useVehicleStore((s) => s.selectVehicle);
  const removeVehicle = useVehicleStore((s) => s.removeVehicle);
  const garage = useVehicleStore((s) => s.garage);
  const active = useVehicleStore((s) => s.vehicle);
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

  const saveToGarage = () => {
    if (!brand) return;
    addVehicle({ brand, model, year });
    setBrand(''); setModel(''); setYear('');
  };

  const pick = (v: Vehicle) => {
    selectVehicle(v);
    const q = [v.brand, v.model, v.year].filter(Boolean).join(' ');
    router.push(`/products?q=${encodeURIComponent(q)}`);
  };

  const label = (v: Vehicle) => [v.brand, v.model, v.year].filter(Boolean).join(' ');

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

      {/* Save current selection to garage */}
      {brand && (
        <button onClick={saveToGarage} className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary transition-colors hover:text-primary/80">
          <Plus className="h-3.5 w-3.5" /> Ավելացնել իմ ավտոտնակ
        </button>
      )}

      {/* My garage — saved vehicles */}
      {garage.length > 0 && (
        <div className="mt-4 border-t pt-3">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Car className="h-3.5 w-3.5" /> Իմ ավտոտնակ
          </p>
          <div className="flex flex-wrap gap-2">
            {garage.map((v) => {
              const isActive = active != null && vehicleKey(active) === vehicleKey(v);
              return (
                <div key={vehicleKey(v)}
                  className={`group inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors ${isActive ? 'border-primary bg-primary/10 text-primary' : 'bg-card hover:border-primary/40'}`}>
                  <button onClick={() => pick(v)} className="inline-flex items-center gap-1.5">
                    {isActive && <Check className="h-3 w-3" />}
                    <span className="font-medium">{label(v)}</span>
                  </button>
                  <button onClick={() => removeVehicle(v)} aria-label="Հեռացնել" className="text-muted-foreground/60 transition-colors hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
