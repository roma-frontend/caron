'use client';

import { useState } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../../../convex/_generated/api';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

import {
  Save,
  Store,
  Truck,
  MessageCircle,
  Bell,
  Globe,
  Power,
  Palette,
  Send,
  Eye,
  EyeOff,
} from 'lucide-react';

import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth';

export default function AdminSettingsPage() {
  const settings = useQuery(api.settings.get, {});
  const save = useMutation(api.settings.save);
  const sendTest = useAction(api.notifications.sendTest);
  const sessionToken = useAuthStore((s) => s.sessionToken);

  const [form, setForm] = useState<Record<string, string | number>>({});
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [testing, setTesting] = useState(false);

  const saveField = async (key: string, value: string | number | boolean) => {
    if (typeof value !== 'boolean') setForm((f) => ({ ...f, [key]: value }));
    try {
      await save({ sessionToken: sessionToken!, [key]: value } as Parameters<typeof save>[0]);
      toast.success('Պահպանվեց');
    } catch {
      toast.error('Սխալ');
    }
  };

  if (settings && !loaded) {
    setForm(settings as unknown as Record<string, string | number>);
    setLoaded(true);
  }

  const handleSave = async () => {
    setSaving(true);

    try {
      await save({
        sessionToken: sessionToken!,
        storeName: String(form.storeName ?? ''),
        phone: String(form.phone ?? ''),
        email: String(form.email ?? ''),
        address: String(form.address ?? ''),
        whatsapp: String(form.whatsapp ?? ''),
        telegram: String(form.telegram ?? ''),
        instagram: String(form.instagram ?? ''),
        facebook: String(form.facebook ?? ''),
        deliveryYerevan: Number(form.deliveryYerevan) || 0,
        deliveryRegions: Number(form.deliveryRegions) || 0,
        freeShippingThreshold:
          Number(form.freeShippingThreshold) || 0,
        announcementBar: String(form.announcementBar ?? ''),
        workingHours: String(form.workingHours ?? ''),
        telegramBotToken: String(form.telegramBotToken ?? ''),
        telegramChatId: String(form.telegramChatId ?? ''),
        mapUrl: String(form.mapUrl ?? ''),
      });

      toast.success('Կարգավորումները պահպանվել են');
    } catch {
      toast.error('Սխալ տեղի ունեցավ');
    } finally {
      setSaving(false);
    }
  };

  const set = (key: string, value: string | number) =>
    setForm({ ...form, [key]: value });

  if (!settings) return null;

  const flags = settings as Record<string, unknown>;

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          {'Կարգավորումներ'}
        </h1>

        <p className="text-muted-foreground">
          {
            'Խանութի կարգավորումներ — թարմացվում է իրական ժամանակում'
          }
        </p>
      </div>

      <div className="space-y-6">
        {/* Store Info */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Store className="h-5 w-5 text-primary" />
              {'Խանութի տվյալներ'}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>{'Անվանում'}</Label>

                <Input
                  value={form.storeName ?? ''}
                  onChange={(e) =>
                    set('storeName', e.target.value)
                  }
                  className="h-10"
                />
              </div>

              <div>
                <Label>{'Հեռախոս'}</Label>

                <Input
                  value={form.phone ?? ''}
                  onChange={(e) =>
                    set('phone', e.target.value)
                  }
                  className="h-10"
                />
              </div>

              <div>
                <Label>{'Էլ. փոստ'}</Label>

                <Input
                  value={form.email ?? ''}
                  onChange={(e) =>
                    set('email', e.target.value)
                  }
                  className="h-10"
                />
              </div>

              <div>
                <Label>{'Աշխատանքային ժամեր'}</Label>

                <Input
                  value={form.workingHours ?? ''}
                  onChange={(e) =>
                    set('workingHours', e.target.value)
                  }
                  className="h-10"
                />
              </div>
            </div>

            <div>
              <Label>{'Հասցե'}</Label>

              <Input
                value={form.address ?? ''}
                onChange={(e) =>
                  set('address', e.target.value)
                }
                className="h-10"
              />
            </div>

            <div>
              <Label>{'Քարտեզի URL (Google Maps embed)'}</Label>
              <Input
                value={form.mapUrl ?? ''}
                onChange={(e) => set('mapUrl', e.target.value)}
                className="h-10 font-mono text-xs"
              />
            </div>
          </CardContent>
        </Card>

        {/* Social */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Globe className="h-5 w-5 text-primary" />
              {'Սոցիալական ցանցեր'}
            </CardTitle>
          </CardHeader>

          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>WhatsApp</Label>

              <Input
                value={form.whatsapp ?? ''}
                onChange={(e) =>
                  set('whatsapp', e.target.value)
                }
                placeholder="37400000000"
                className="h-10"
              />
            </div>

            <div>
              <Label>Telegram</Label>

              <Input
                value={form.telegram ?? ''}
                onChange={(e) =>
                  set('telegram', e.target.value)
                }
                placeholder="@caroon_am"
                className="h-10"
              />
            </div>

            <div>
              <Label>Instagram</Label>

              <Input
                value={form.instagram ?? ''}
                onChange={(e) =>
                  set('instagram', e.target.value)
                }
                placeholder="@caroon.am"
                className="h-10"
              />
            </div>

            <div>
              <Label>Facebook</Label>

              <Input
                value={form.facebook ?? ''}
                onChange={(e) =>
                  set('facebook', e.target.value)
                }
                placeholder="caroon.am"
                className="h-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Delivery */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Truck className="h-5 w-5 text-primary" />
              {'Առաքում'}
            </CardTitle>
          </CardHeader>

          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label>{'Երևան (֏)'}</Label>

              <Input
                type="number"
                value={form.deliveryYerevan ?? 0}
                onChange={(e) =>
                  set(
                    'deliveryYerevan',
                    Number(e.target.value)
                  )
                }
                className="h-10"
              />
            </div>

            <div>
              <Label>{'Մարզեր (֏)'}</Label>

              <Input
                type="number"
                value={form.deliveryRegions ?? 0}
                onChange={(e) =>
                  set(
                    'deliveryRegions',
                    Number(e.target.value)
                  )
                }
                className="h-10"
              />
            </div>

            <div>
              <Label>{'Անվճար առաքում (֏)'}</Label>

              <Input
                type="number"
                value={form.freeShippingThreshold ?? 0}
                onChange={(e) =>
                  set(
                    'freeShippingThreshold',
                    Number(e.target.value)
                  )
                }
                className="h-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Announcement */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageCircle className="h-5 w-5 text-primary" />
              {'Հայտարարություն'}
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div>
              <Label>{'Վերին գոտու տեքստ'}</Label>

              <Input
                value={form.announcementBar ?? ''}
                onChange={(e) =>
                  set(
                    'announcementBar',
                    e.target.value
                  )
                }
                className="h-10"
                placeholder={
                  'Անվճար առաքում 20,000֏-ից...'
                }
              />
            </div>

            <p className="mt-2 text-xs text-muted-foreground">
              {
                'Թարմացվում է իրական ժամանակում կայքի վերևում'
              }
            </p>
          </CardContent>
        </Card>

        {/* Telegram Notifications */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="h-5 w-5 text-primary" />
              {'Ծանուցումներ (Telegram Bot)'}
            </CardTitle>
          </CardHeader>

          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Bot Token</Label>

              <div className="relative">
                <Input
                  type={showToken ? 'text' : 'password'}
                  value={form.telegramBotToken ?? ''}
                  onChange={(e) => set('telegramBotToken', e.target.value)}
                  onBlur={(e) => saveField('telegramBotToken', e.target.value)}
                  placeholder="123456:ABC-DEF..."
                  className="h-10 pr-9 font-mono text-xs"
                />
                <button type="button" onClick={() => setShowToken(!showToken)} aria-label="Toggle token" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label>Chat ID</Label>

              <Input
                value={form.telegramChatId ?? ''}
                onChange={(e) =>
                  set(
                    'telegramChatId',
                    e.target.value
                  )
                }
                placeholder="-1001234567890"
                className="h-10 font-mono text-xs"
              />
            </div>

            <div className="sm:col-span-2">
              <Button variant="outline" size="sm" className="gap-2" disabled={testing}
                onClick={async () => { setTesting(true); try { await sendTest({}); toast.success('Թեստային ծանուցումն ուղարկվեց'); } catch (e) { toast.error(e instanceof Error ? e.message : 'Չհաջողվեց ուղարկել'); } finally { setTesting(false); } }}>
                <Send className="h-4 w-4" /> {testing ? 'Ուղարկվում է...' : 'Ուղարկել թեստ'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Control Center — real-time toggles */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Power className="h-5 w-5 text-primary" />
              {'Կառավարման կենտրոն'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{'Տեխնիկական աշխատանքներ'}</p>
                  <p className="text-xs text-muted-foreground">{'Փակում է խանութը այցելուների համար'}</p>
                </div>
                <Switch checked={flags.maintenanceMode === true} onCheckedChange={(v) => saveField('maintenanceMode', v)} />
              </div>
              {flags.maintenanceMode === true && (
                <Input className="mt-3 h-10" placeholder={'Հաղորդագրություն...'} value={form.maintenanceMessage ?? ''}
                  onChange={(e) => set('maintenanceMessage', e.target.value)} onBlur={(e) => saveField('maintenanceMessage', e.target.value)} />
              )}
            </div>

            {([
              ['announcementEnabled', 'Հայտարարության գոտի'],
              ['showCategories', 'Կատեգորիաների բաժին (գլխավոր)'],
              ['showFeatured', 'Առաջարկվող ապրանքներ (գլխավոր)'],
              ['showBrands', 'Բրենդների շարք (գլխավոր)'],
              ['showFeatures', 'Առավելությունների բաժին (գլխավոր)'],
              ['enableCarSelector', 'Ավտոյի ընտրիչ'],
              ['enableReviews', 'Ապրանքի գնահատականներ'],
            ] as [string, string][]).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between gap-3">
                <span className="text-sm">{label}</span>
                <Switch checked={flags[key] !== false} onCheckedChange={(v) => saveField(key, v)} />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Branding — live accent color */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Palette className="h-5 w-5 text-primary" />
              {'Բրենդ / Գույն'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-3">
              <input type="color" aria-label="Ակցենտ գույն" value={(form.accentColor as string) || '#0F6CBD'}
                onChange={(e) => saveField('accentColor', e.target.value)}
                className="h-10 w-14 cursor-pointer rounded-md border bg-transparent p-1" />
              <span className="text-sm text-muted-foreground">{'Ակցենտ գույնը՝ փոխվում է ողջ կայքում իրական ժամանակում'}</span>
              {!!form.accentColor && <Button variant="ghost" size="sm" onClick={() => saveField('accentColor', '')}>{'Վերականգնել'}</Button>}
            </div>
          </CardContent>
        </Card>

        <Button
          onClick={handleSave}
          disabled={saving}
          size="lg"
          className="w-full gap-2"
        >
          <Save className="h-5 w-5" />

          {saving
            ? 'Պահպանվում է...'
            : 'Պահպանել կարգավորումները'}
        </Button>
      </div>
    </div>
  );
}