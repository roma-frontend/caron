'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Phone, Mail, MapPin, Clock, Send, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useSettings } from '@/hooks/useSettings';
import { useReveal, revealStyle } from '@/lib/motion';
import { useT } from '@/lib/i18n/admin';



export default function ContactPage() {
  const { t } = useT();
  const settings = useSettings();
  const CONTACTS = [
  { icon: Phone, label: t('pg.contact.phone'), value: settings?.phone || '+374 XX XXX XXX', href: `tel:${settings?.phone || ''}` },
  { icon: Mail, label: t('pg.contact.email'), value: settings?.email || 'info@caron.group', href: `mailto:${settings?.email || 'info@caron.group'}` },
  { icon: Mail, label: t('pg.contact.salesCoop'), value: 'sales@caron.group', href: 'mailto:sales@caron.group' },
  { icon: MapPin, label: t('pg.contact.address'), value: settings?.address || t('pg.contact.defaultCity'), href: `https://www.google.com/maps/search/${encodeURIComponent(settings?.address || '')}` },
  { icon: Clock, label: t('pg.contact.workHours'), value: settings?.workingHours || '10:00 - 19:00' },
];
  const [form, setForm] = useState({ name: '', phone: '', email: '', message: '' });
  const [sending, setSending] = useState(false);
  const { ref, visible } = useReveal();


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.message) { toast.error(t('pg.contact.allRequired')); return; }
    setSending(true);
    try {
      await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      toast.success(t('pg.contact.sent'));
      setForm({ name: '', phone: '', email: '', message: '' });
    } catch { toast.error(t('pg.contact.error')); } finally { setSending(false); }
  };

  return (
    <div className="mx-auto max-w-[var(--container-max)] px-4 sm:px-[var(--space-container)] py-[var(--space-8)]">
      {/* Header */}
      <div className="mb-12 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <MessageCircle className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-4xl font-bold">{t('pg.contact.title')}</h1>
        <p className="mt-3 text-lg text-muted-foreground">{t('pg.contact.subtitle')}</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-5">
        {/* Contact info */}
        <div className="space-y-4 lg:col-span-2">
          {CONTACTS.map((c, i) => {
            const Wrapper = c.href ? 'a' : 'div';
            return (
              <div key={c.label} ref={ref} style={revealStyle(visible, i * 0.1)}>
                <Wrapper href={c.href || undefined} target={c.href?.startsWith('http') ? '_blank' : undefined} rel={c.href?.startsWith('http') ? 'noopener noreferrer' : undefined}>
                  <Card className="transition-all hover:shadow-md hover:border-primary/40 cursor-pointer" style={{ boxShadow: 'var(--shadow-xs)' }}>
                    <CardContent className="flex items-center gap-4 p-5">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                        <c.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{c.label}</p>
                        <p className="font-medium">{c.value}</p>
                      </div>
                    </CardContent>
                  </Card>
                </Wrapper>
              </div>
            );
          })}

          {/* Map placeholder */}
          <div className="mt-4 aspect-video overflow-hidden rounded-xl border bg-muted/30">
            {settings?.mapUrl ? (
              <iframe src={settings.mapUrl} width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy" />
            ) : (
              <iframe src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || ""}&q=${encodeURIComponent(settings?.address || t('pg.contact.mapCity'))}`} width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy" />
            )}
          </div>
        </div>

        {/* Form */}
        <div className="lg:col-span-3">
          <Card style={{ boxShadow: 'var(--shadow-lg)' }}>
            <CardContent className="p-6 md:p-8">
              <h2 className="mb-6 text-xl font-bold px-4 s,:px-0">{t('pg.contact.formTitle')}</h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><Label>{t('pg.contact.fullName')} *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t('pg.contact.fullName')} className="h-11" /></div>
                  <div><Label>{t('pg.contact.phone')} *</Label><Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+374..." className="h-11" /></div>
                </div>
                <div><Label>{t('pg.contact.email')}</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder={t('pg.contact.emailPlaceholder')} className="h-11" /></div>
                <div><Label>{t('pg.contact.message')} *</Label><Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder={t('pg.contact.messagePlaceholder')} rows={5} /></div>
                <Button type="submit" variant="cta" size="xl" className="w-full gap-2" disabled={sending}>
                  <Send className="h-5 w-5" /> {sending ? t('pg.contact.sending') : t('pg.contact.send')}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
