'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

import {
  Save,
  Store,
  Truck,
  MessageCircle,
  Bell,
  Globe,
} from 'lucide-react';

import { toast } from 'sonner';

export default function AdminSettingsPage() {
  const settings = useQuery(api.settings.get, {});
  const save = useMutation(api.settings.save);

  const [form, setForm] = useState<Record<string, string | number>>({});
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  if (settings && !loaded) {
    setForm(settings as Record<string, string | number>);
    setLoaded(true);
  }

  const handleSave = async () => {
    setSaving(true);

    try {
      await save({
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

              <Input
                value={form.telegramBotToken ?? ''}
                onChange={(e) =>
                  set(
                    'telegramBotToken',
                    e.target.value
                  )
                }
                placeholder="123456:ABC-DEF..."
                className="h-10 font-mono text-xs"
              />
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