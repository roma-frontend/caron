'use client';

import { useQuery } from 'convex/react';
import { Truck } from 'lucide-react';
import { api } from '../../convex/_generated/api';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';

type Zone = {
  _id: string;
  group: 'yerevan' | 'region';
  name: string;
  schedule: string;
  order: number;
  isActive: boolean;
};

function ZoneGroup({ title, zones }: { title: string; zones: Zone[] }) {
  if (zones.length === 0) return null;
  return (
    <div className="grid gap-4 md:grid-cols-[220px_1fr] md:gap-8">
      {/* Heading column */}
      <div className="md:pt-2">
        <h3 className="flex items-center gap-2 text-lg font-bold uppercase tracking-wide text-primary">
          <Truck className="h-5 w-5 shrink-0" />
          <span>{title}</span>
        </h3>
      </div>

      {/* Accordion column */}
      <Accordion className="rounded-xl border bg-card/40 px-4">
        {zones.map((z) => (
          <AccordionItem key={z._id} value={z._id}>
            <AccordionTrigger className="text-base font-medium">
              {z.name}
            </AccordionTrigger>
            <AccordionContent>
              {z.schedule.trim() ? (
                <p className="whitespace-pre-line text-sm text-muted-foreground leading-relaxed">
                  {z.schedule}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground/70">—</p>
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

export function DeliverySchedule() {
  const zones = useQuery(api.delivery.list, {}) as Zone[] | undefined;

  if (!zones || zones.length === 0) return null;

  const yerevan = zones.filter((z) => z.group === 'yerevan').sort((a, b) => a.order - b.order);
  const regions = zones.filter((z) => z.group === 'region').sort((a, b) => a.order - b.order);

  return (
    <section className="mt-12 space-y-10">
      <h2 className="text-center text-2xl font-bold">
        {'Առաքման գրաֆիկ'}
      </h2>
      <ZoneGroup
        title={'Երևանի գրաֆիկ'}
        zones={yerevan}
      />
      <ZoneGroup
        title={'Մարզերի գրաֆիկ'}
        zones={regions}
      />
    </section>
  );
}
