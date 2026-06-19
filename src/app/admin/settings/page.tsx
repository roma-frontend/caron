'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../../../convex/_generated/api';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

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
  ShoppingCart,
  Smartphone,
  BarChart3,
  Trash2,
} from 'lucide-react';

import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth';

export default function AdminSettingsPage() {
  const router = useRouter();
  const sessionToken = useAuthStore((s) => s.sessionToken);
  const settings = useQuery(api.settings.get, sessionToken ? { sessionToken } : 'skip');
  const save = useMutation(api.settings.save);
  const sendTest = useAction(api.notifications.sendTest);

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

  const BADGE_VARIANTS = ['hot', 'new', 'sale', 'boom', 'trending', 'popular', 'best'];
  const VAR_ICONS: Record<string, string> = { hot: '🔥', new: '✨', sale: '🏷️', boom: '💥', trending: '📈', popular: '⭐', best: '👑' };
  const VAR_CLASSES: Record<string, string> = { hot: 'animate-navbadge-hot', new: 'animate-navbadge-new', sale: 'animate-navbadge-sale', boom: 'animate-navbadge-boom', trending: 'animate-navbadge-trending', popular: 'animate-navbadge-popular', best: 'animate-navbadge-best' };
  const VAR_BG: Record<string, string> = { hot: 'bg-gradient-to-r from-rose-500 to-orange-500', new: 'bg-gradient-to-r from-emerald-500 to-teal-500', sale: 'bg-gradient-to-r from-red-600 to-rose-500', boom: 'bg-gradient-to-r from-amber-400 to-yellow-500', trending: 'bg-gradient-to-r from-violet-500 to-purple-600', popular: 'bg-gradient-to-r from-sky-500 to-blue-600', best: 'bg-gradient-to-r from-amber-500 to-orange-400' };

  const saveNavBadges = async () => {
    const entries = ['promotions', 'products', 'categories', 'about'].map((key) => {
      const text = form[`_nb_${key}_text`] as string;
      const variant = form[`_nb_${key}_variant`] as string;
      return text && variant ? { path: `/${key}`, text, variant } : null;
    }).filter(Boolean);
    const json = JSON.stringify(entries);
    try {
      await save({ sessionToken: sessionToken!, navBadges: json } as Parameters<typeof save>[0]);
      toast.success('Բեյջերը պահպանվեցին');
    } catch { toast.error('Սխալ'); }
  };

  const saveAnnouncement = async () => {
    const text = form._ab_text as string || '';
    if (!text) { toast.error('Տեքստը պարտադիր է'); return; }
    const json = JSON.stringify({
      text,
      type: (form._ab_type as string) || 'info',
      icon: (form._ab_icon as string) || undefined,
      link: (form._ab_link as string) || undefined,
      linkText: (form._ab_linkText as string) || undefined,
      dismissible: form._ab_dismiss !== 0,
    });
    try {
      await save({ sessionToken: sessionToken!, announcementBar: json } as Parameters<typeof save>[0]);
      toast.success('Հայտարարությունը պահպանվեց');
    } catch { toast.error('Սխալ'); }
  };

  if (settings && !loaded) {
    const raw = (settings as Record<string, unknown>).announcementBar as string || '';
    let abFields: Record<string, string | number> = {};
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) {
        abFields = {
          _ab_text: parsed.text || '',
          _ab_type: parsed.type || 'info',
          _ab_icon: parsed.icon || '',
          _ab_link: parsed.link || '',
          _ab_linkText: parsed.linkText || '',
          _ab_dismiss: parsed.dismissible !== false ? 1 : 0,
        };
      }
    } catch { abFields = { _ab_text: raw || '', _ab_type: 'info', _ab_dismiss: 1 }; }
    const nbFields: Record<string, string | number> = {};
    try {
      const nbRaw = (settings as Record<string, unknown>).navBadges as string || '';
      const nbParsed = JSON.parse(nbRaw) as Array<Record<string, string>>;
      if (Array.isArray(nbParsed)) {
        for (const entry of nbParsed) {
          const key = entry.path?.replace('/', '');
          if (key) {
            nbFields[`_nb_${key}_text`] = entry.text || '';
            nbFields[`_nb_${key}_variant`] = entry.variant || '';
          }
        }
      }
    } catch {}
    setForm({ ...settings as unknown as Record<string, string | number>, ...abFields, ...nbFields });
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
        minOrderAmount: Number(form.minOrderAmount) || 0,
        enableQuickBuy: flags.enableQuickBuy !== false,
        paymentMethods: form.paymentMethods ? (Array.isArray(form.paymentMethods) ? form.paymentMethods : JSON.parse(String(form.paymentMethods))) : ['cash', 'card'],
        bankName: String(form.bankName ?? ''),
        bankAccount: String(form.bankAccount ?? ''),
        bankCode: String(form.bankCode ?? ''),
        cardNumber: String(form.cardNumber ?? ''),
        paymentNote: String(form.paymentNote ?? ''),
        gaId: String(form.gaId ?? ''),
        fbPixelId: String(form.fbPixelId ?? ''),
        enableCookieConsent: flags.enableCookieConsent === true,
        cookieConsentText: String(form.cookieConsentText ?? ''),
        enableNewsletter: flags.enableNewsletter === true,
        defaultViewMode: form.defaultViewMode === 'list' ? 'list' : 'grid',
        productsPerPage: Number(form.productsPerPage) || 20,
        enableBreadcrumbs: flags.enableBreadcrumbs !== false,
        enableScrollToTop: flags.enableScrollToTop !== false,
        logoUrl: String(form.logoUrl ?? ''),
        customCss: String(form.customCss ?? ''),
        customJsHead: String(form.customJsHead ?? ''),
        enableRegistration: flags.enableRegistration !== false,
        enableVinDecoder: flags.enableVinDecoder === true,
        enableOemSearch: flags.enableOemSearch === true,
        defaultWarranty: String(form.defaultWarranty ?? ''),
        lowStockThreshold: Number(form.lowStockThreshold) || 5,
        showStockCount: flags.showStockCount !== false,
        deliveryEstimateYerevan: String(form.deliveryEstimateYerevan ?? ''),
        deliveryEstimateRegions: String(form.deliveryEstimateRegions ?? ''),
        maxCartItems: Number(form.maxCartItems) || 50,
        enableCrossSell: flags.enableCrossSell !== false,
        enableQuickView: flags.enableQuickView !== false,
        enableShareButtons: flags.enableShareButtons !== false,
        enableBackInStock: flags.enableBackInStock !== false,
        enableOrderHistory: flags.enableOrderHistory === true,
      });

      toast.success('Կարգավորումները պահպանվել են');
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg.includes('Not authenticated') || msg.includes('Սեսիան ավարտվել է')) {
        toast.error('Սեսիան ավարտվել է, մուտք գործեք կրկին');
        router.push('/login');
      } else {
        toast.error('Սխալ տեղի ունեցավ');
      }
    } finally {
      setSaving(false);
    }
  };

  const set = (key: string, value: string | number) =>
    setForm({ ...form, [key]: value });

  if (!settings) return null;

  const flags = settings as Record<string, unknown>;

  const TAB_ICONS: Record<string, typeof Store> = {
    main: Store,
    delivery: Truck,
    cart: ShoppingCart,
    marketing: BarChart3,
    notifications: Bell,
    ui: Palette,
    advanced: Smartphone,
  };

  return (
    <div className="max-w-4xl">
      <style>{`.settings-tab[data-active] { background: var(--primary) !important; color: white !important; box-shadow: 0 2px 8px rgba(15,108,189,0.3) !important; }`}</style>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{'Կարգավորումներ'}</h1>
        <p className="text-muted-foreground">{'Խանութի կարգավորումներ — թարմացվում է իրական ժամանակում'}</p>
      </div>

      <Tabs defaultValue="main">
        <TabsList className="mb-6 flex-wrap h-auto gap-1">
          {(['main', 'delivery', 'cart', 'marketing', 'notifications', 'ui', 'advanced'] as const).map((tab) => {
            const Icon = TAB_ICONS[tab];
            const labels: Record<string, string> = {
              main: 'Խանութ', delivery: 'Առաքում', cart: 'Վաճառք', marketing: 'Մարքեթինգ',
              notifications: 'Ծանուցումներ', ui: 'UI', advanced: 'Լրացուցիչ',
            };
            return (
              <TabsTrigger key={tab} value={tab} className="px-3 py-1.5 settings-tab">
                <Icon className="h-4 w-4" /> {labels[tab]}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* ─── Tab: Store Info ─── */}
        <TabsContent value="main" className="space-y-6">
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
                  <Input value={form.storeName ?? ''} onChange={(e) => set('storeName', e.target.value)} className="h-10" />
                </div>
                <div>
                  <Label>{'Հեռախոս'}</Label>
                  <Input value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} className="h-10" />
                </div>
                <div>
                  <Label>{'Էլ. փոստ'}</Label>
                  <Input value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} className="h-10" />
                </div>
                <div>
                  <Label>{'Աշխատանքային ժամեր'}</Label>
                  <Input value={form.workingHours ?? ''} onChange={(e) => set('workingHours', e.target.value)} className="h-10" />
                </div>
              </div>
              <div>
                <Label>{'Հասցե'}</Label>
                <Input value={form.address ?? ''} onChange={(e) => set('address', e.target.value)} className="h-10" />
              </div>
              <div>
                <Label>{'Քարտեզի URL (Google Maps embed)'}</Label>
                <Input value={form.mapUrl ?? ''} onChange={(e) => set('mapUrl', e.target.value)} className="h-10 font-mono text-xs" />
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
                <Input value={form.whatsapp ?? ''} onChange={(e) => set('whatsapp', e.target.value)} placeholder="37400000000" className="h-10" />
              </div>
              <div>
                <Label>Telegram</Label>
                <Input value={form.telegram ?? ''} onChange={(e) => set('telegram', e.target.value)} placeholder="@caron_am" className="h-10" />
              </div>
              <div>
                <Label>Instagram</Label>
                <Input value={form.instagram ?? ''} onChange={(e) => set('instagram', e.target.value)} placeholder="@caron_am" className="h-10" />
              </div>
              <div>
                <Label>Facebook</Label>
                <Input value={form.facebook ?? ''} onChange={(e) => set('facebook', e.target.value)} placeholder="caron" className="h-10" />
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
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">JSON-ը կգեներացվի ստորև նշված դաշտերից և կպահպանվի ՀԱՅՏԱՐԱՐՈՒԹՅՈԻՆ դաշտում</p>
              <div>
                <Label>{'Վերին գոտու տեքստ'}</Label>
                <Input value={form._ab_text ?? ''} onChange={(e) => set('_ab_text', e.target.value)} className="h-10" placeholder={'Անվճար առաքում 30.000֏-ից...'} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{'Պատրաստի տարբերակներ (սեղմել → խմբագրել)'}</Label>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {[
                    ['🚚 Անվճար առաքում 30.000 ֏-ից սկսած', 'info', 'truck'],
                    ['🔥 Մինչև -40% զեղչ ամառային ակցիայի շրջանակներում', 'sale', 'zap'],
                    ['⚡ Ակցիա․ ամեն 3-րդ ապրանքը՝ -15%', 'sale', 'percent'],
                    ['🎁 Գնիր 2 ապրանք և ստացիր 1-ը նվեր', 'sale', 'gift'],
                    ['💥 Սահմանափակ առաջարկ․ զեղչեր մինչև -50%', 'promo', 'sparkles'],
                    ['⭐ Միայն օրիգինալ որակի պահեստամասեր', 'info', 'star'],
                    ['❄️ Ձմեռային անվադողեր՝ մեծ զեղչերով', 'promo', 'bell'],
                    ['🔧 Գարնանային տեխզննության հատուկ առաջարկ', 'info', 'clock'],
                  ].map(([text, type, icon]) => (
                    <button
                      key={text as string}
                      onClick={() => setForm((f) => ({ ...f, _ab_text: text as string, _ab_type: type as string, _ab_icon: icon as string }))}
                      className="rounded-full border border-border/50 bg-card px-2.5 py-1 text-[11px] text-foreground/80 transition-colors hover:border-primary/40 hover:text-primary hover:bg-primary/5"
                    >
                      {text as string}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{'Ոճ'}</Label>
                  <select value={form._ab_type as string || 'info'} onChange={(e) => set('_ab_type', e.target.value)}
                    className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground">
                    <option value="info" className="bg-background text-foreground">Տեղեկատվություն</option>
                    <option value="sale" className="bg-background text-foreground">Վաճառք</option>
                    <option value="promo" className="bg-background text-foreground">Պրոմո</option>
                    <option value="dark" className="bg-background text-foreground">Մուգ</option>
                  </select>
                </div>
                <div>
                  <Label>{'Պատկերակ'}</Label>
                  <select value={form._ab_icon as string || ''} onChange={(e) => set('_ab_icon', e.target.value)}
                    className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground">
                    <option value="" className="bg-background text-foreground">—</option>
                    <option value="sparkles" className="bg-background text-foreground">Sparkles</option>
                    <option value="zap" className="bg-background text-foreground">Zap</option>
                    <option value="truck" className="bg-background text-foreground">Truck</option>
                    <option value="clock" className="bg-background text-foreground">Clock</option>
                    <option value="gift" className="bg-background text-foreground">Gift</option>
                    <option value="percent" className="bg-background text-foreground">Percent</option>
                    <option value="bell" className="bg-background text-foreground">Bell</option>
                    <option value="star" className="bg-background text-foreground">Star</option>
                  </select>
                </div>
                <div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{'Հղում (URL)'}</Label>
                  <Input value={form._ab_link as string ?? ''} onChange={(e) => set('_ab_link', e.target.value)} className="h-10" placeholder={'/products'} />
                </div>
                <div>
                  <Label>{'Կոճակի տեքստ'}</Label>
                  <Input value={form._ab_linkText as string ?? ''} onChange={(e) => set('_ab_linkText', e.target.value)} className="h-10" placeholder={'Գնել'} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="ab_dismiss" checked={form._ab_dismiss !== 0} onChange={(e) => set('_ab_dismiss', e.target.checked ? 1 : 0)} className="h-4 w-4 rounded border border-input bg-transparent" />
                <Label htmlFor="ab_dismiss" className="text-sm font-normal">{'Հնարավորություն տալ փակելու'}</Label>
              </div>
              <Button onClick={saveAnnouncement} size="sm" className="gap-1.5 text-xs">
                <Save className="h-3.5 w-3.5" /> {'Պահպանել'}
              </Button>
            </CardContent>
          </Card>

          {/* Nav badges */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bell className="h-5 w-5 text-primary" />
                {'Նավիգացիոն բեյջեր'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">Բեյջի տեքստեր և ստիլներ</p>
              {([
                ['/promotions', form._nb_promotions_text as string ?? '', form._nb_promotions_variant as string ?? ''],
                ['/products', form._nb_products_text as string ?? '', form._nb_products_variant as string ?? ''],
                ['/categories', form._nb_categories_text as string ?? '', form._nb_categories_variant as string ?? ''],
                ['/about', form._nb_about_text as string ?? '', form._nb_about_variant as string ?? ''],
              ] as [string, string, string][]).map(([path, txt, v]) => (
                <div key={path} className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
                  <span className="w-28 shrink-0 text-xs font-medium text-muted-foreground">{path}</span>
                  <input value={txt} onChange={(e) => set(`_nb_${path.slice(1)}_text`, e.target.value)} placeholder="Տեքստ" className="h-8 w-24 rounded-md border border-input bg-background px-2 text-xs outline-none" />
                  <select value={v} onChange={(e) => set(`_nb_${path.slice(1)}_variant`, e.target.value)} className="h-8 rounded-md border border-input bg-background px-2 text-xs outline-none">
                    <option value="">—</option>
                    {BADGE_VARIANTS.map((varName) => <option key={varName} value={varName}>{VAR_ICONS[varName]} {varName}</option>)}
                  </select>
                  {txt && v && (
                    <span className={`${VAR_CLASSES[v]} ${VAR_BG[v]} inline-flex items-center gap-0.5 rounded-full px-1.5 py-[1px] text-[9px] font-black uppercase leading-tight text-white shadow-sm shrink-0`}>
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inset-0 rounded-full bg-white/70 animate-navbadge-ping" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
                      </span>
                      {txt}
                    </span>
                  )}
                </div>
              ))}
              <Button onClick={saveNavBadges} size="sm" className="gap-1.5 text-xs">
                <Save className="h-3.5 w-3.5" /> {'Պահպանել'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Tab: Delivery ─── */}
        <TabsContent value="delivery" className="space-y-6">
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
                <Input type="number" value={Number(form.deliveryYerevan) || 0} onChange={(e) => set('deliveryYerevan', Number(e.target.value))} className="h-10" />
              </div>
              <div>
                <Label>{'Մարզեր (֏)'}</Label>
                <Input type="number" value={Number(form.deliveryRegions) || 0} onChange={(e) => set('deliveryRegions', Number(e.target.value))} className="h-10" />
              </div>
              <div>
                <Label>{'Անվճար առաքում (֏)'}</Label>
                <Input type="number" value={Number(form.freeShippingThreshold) || 0} onChange={(e) => set('freeShippingThreshold', Number(e.target.value))} className="h-10" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Tab: Cart ─── */}
        <TabsContent value="cart" className="space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShoppingCart className="h-5 w-5 text-primary" />
                {'Զամբյուղ և վճարում'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label>{'Նվազագույն պատվեր (֏)'}</Label>
                  <Input type="number" value={Number(form.minOrderAmount) || 0} onChange={(e) => set('minOrderAmount', Number(e.target.value))} className="h-10" />
                </div>
                <div>
                  <Label>{'Ապրանքներ էջում'}</Label>
                  <Input type="number" value={Number(form.productsPerPage) || 20} onChange={(e) => set('productsPerPage', Number(e.target.value))} className="h-10" />
                </div>
                <div>
                  <Label>{'Երաշխիք (լռությամբ)'}</Label>
                  <Input value={String(form.defaultWarranty ?? '')} onChange={(e) => set('defaultWarranty', e.target.value)} className="h-10" />
                </div>
              </div>
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-2">
                  <Switch checked={flags.enableQuickBuy !== false} onCheckedChange={(v) => saveField('enableQuickBuy', v)} />
                  <span className="text-sm">{'Արագ գնում'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={flags.enableBreadcrumbs !== false} onCheckedChange={(v) => saveField('enableBreadcrumbs', v)} />
                  <span className="text-sm">{'Հացի փշրանքներ'}</span>
                </div>
              <div className="flex items-center gap-2">
                <Switch checked={flags.enableScrollToTop !== false} onCheckedChange={(v) => saveField('enableScrollToTop', v)} />
                <span className="text-sm">{'Կոճակ Վերև'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={flags.enableShareButtons !== false} onCheckedChange={(v) => saveField('enableShareButtons', v)} />
                <span className="text-sm">{'Կոճակ Կիսվել'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={flags.enableBackInStock !== false} onCheckedChange={(v) => saveField('enableBackInStock', v)} />
                <span className="text-sm">{'Տեղեկացնել առկայության մասին'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={flags.enablePriceAlert !== false} onCheckedChange={(v) => saveField('enablePriceAlert', v)} />
                <span className="text-sm">{'Զեղչի մասին ծանուցում'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={flags.enablePickup !== false} onCheckedChange={(v) => saveField('enablePickup', v)} />
                <span className="text-sm">{'Ինքնահանում խանութից'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={flags.enableTimeline !== false} onCheckedChange={(v) => saveField('enableTimeline', v)} />
                <span className="text-sm">{'Պատվերի ժամանակացույց'}</span>
              </div>
            </div>
              <div>
                <Label>{'Վճարման եղանակներ'}</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {['cash', 'card', 'idram', 'easypay', 'transfer'].map((m) => {
                    const labels: Record<string, string> = { cash: 'Կանխիկ', card: 'Քարտով', idram: 'Idram', easypay: 'EasyPay', transfer: 'Բանկային փոխանցում' };
                    const raw = form.paymentMethods;
                    const pm: string[] = raw ? (Array.isArray(raw) ? raw : JSON.parse(String(raw))) : ['cash', 'card', 'idram', 'easypay'];
                    const active = pm.includes(m);
                    return (
                      <button key={m} onClick={() => {
                        const current: string[] = raw ? (Array.isArray(raw) ? raw : JSON.parse(String(raw))) : ['cash', 'card', 'idram', 'easypay'];
                        const next = active ? current.filter((x) => x !== m) : [...current, m];
                        setForm({ ...form, paymentMethods: JSON.stringify(next) as unknown as number });
                      }} className={`rounded-xl border px-3 py-1.5 text-xs transition-all ${active ? 'border-primary bg-primary/10 text-primary' : 'text-muted-foreground hover:border-primary/40'}`}>{labels[m] || m}</button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Tab: Marketing ─── */}
        <TabsContent value="marketing" className="space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="h-5 w-5 text-primary" />
                {'Մարքեթինգ'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Google Analytics ID</Label>
                  <Input value={String(form.gaId ?? '')} onChange={(e) => set('gaId', e.target.value)} placeholder="G-XXXXXXXXXX" className="h-10 font-mono text-xs" />
                </div>
                <div>
                  <Label>Facebook Pixel ID</Label>
                  <Input value={String(form.fbPixelId ?? '')} onChange={(e) => set('fbPixelId', e.target.value)} placeholder="1234567890" className="h-10 font-mono text-xs" />
                </div>
              </div>
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-2">
                  <Switch checked={flags.enableCookieConsent === true} onCheckedChange={(v) => saveField('enableCookieConsent', v)} />
                  <span className="text-sm">{'Cookie Համաձայնություն'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={flags.enableNewsletter === true} onCheckedChange={(v) => saveField('enableNewsletter', v)} />
                  <span className="text-sm">{'Նորություններ (footer)'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={flags.enableRegistration !== false} onCheckedChange={(v) => saveField('enableRegistration', v)} />
                  <span className="text-sm">{'Գրանցում'}</span>
                </div>
              </div>
              {flags.enableCookieConsent === true && (
                <div>
                  <Label>{'Cookie Consent տեքստ'}</Label>
                  <Input value={String(form.cookieConsentText ?? '')} onChange={(e) => set('cookieConsentText', e.target.value)} className="h-10" />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Tab: Notifications ─── */}
        <TabsContent value="notifications" className="space-y-6">
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
                  <Input type={showToken ? 'text' : 'password'} value={form.telegramBotToken ?? ''} onChange={(e) => set('telegramBotToken', e.target.value)}
                    onBlur={(e) => saveField('telegramBotToken', e.target.value)} placeholder="123456:ABC-DEF..." className="h-10 pr-9 font-mono text-xs" />
                  <button type="button" onClick={() => setShowToken(!showToken)} aria-label="Toggle token" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label>Chat ID</Label>
                <Input value={form.telegramChatId ?? ''} onChange={(e) => set('telegramChatId', e.target.value)} placeholder="-1001234567890" className="h-10 font-mono text-xs" />
              </div>
              <div className="sm:col-span-2">
                <Button variant="outline" size="sm" className="gap-2" disabled={testing}
                  onClick={async () => { setTesting(true); try { await sendTest({ sessionToken: sessionToken! }); toast.success('Թեստային ծանուցումն ուղարկվեց'); } catch (e) { toast.error(e instanceof Error ? e.message : 'Չհաջողվեց ուղարկել'); } finally { setTesting(false); } }}>
                  <Send className="h-4 w-4" /> {testing ? 'Ուղարկվում է...' : 'Ուղարկել թեստ'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Tab: UI ─── */}
        <TabsContent value="ui" className="space-y-6">
          {/* Control Center */}
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
                ['enablePriceFilter', 'Գնի ֆիլտր'],
                ['enableReviews', 'Ապրանքի գնահատականներ'],
              ] as [string, string][]).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between gap-3">
                  <span className="text-sm">{label}</span>
                  <Switch checked={flags[key] !== false} onCheckedChange={(v) => saveField(key, v)} />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Branding / Accent */}
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
        </TabsContent>

        {/* ─── Tab: Advanced ─── */}
        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Smartphone className="h-5 w-5 text-primary" />
                {'Լրացուցիչ կարգավորումներ'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>{'Logo URL (թափուր = SVG լոգո)'}</Label>
                <Input value={String(form.logoUrl ?? '')} onChange={(e) => set('logoUrl', e.target.value)} placeholder="https://example.com/logo.png" className="h-10" />
              </div>
              <div>
                <Label>Custom CSS</Label>
                <textarea value={String(form.customCss ?? '')} onChange={(e) => set('customCss', e.target.value)} className="h-20 w-full rounded-xl border bg-background p-3 font-mono text-xs outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <Label>Custom JS (head)</Label>
                <textarea value={String(form.customJsHead ?? '')} onChange={(e) => set('customJsHead', e.target.value)} className="h-20 w-full rounded-xl border bg-background p-3 font-mono text-xs outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={flags.enableVinDecoder === true} onCheckedChange={(v) => saveField('enableVinDecoder', v)} />
                <span className="text-sm">{'VIN-դեկոդեր'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={flags.enableOemSearch === true} onCheckedChange={(v) => saveField('enableOemSearch', v)} />
                <span className="text-sm">{'OEM որոնում'}</span>
              </div>
            </CardContent>
          </Card>

          {/* Filter Migration */}
          <FilterMigrationCard sessionToken={sessionToken || ''} />
          <NormalizeBrandsCard sessionToken={sessionToken || ''} />
          <ImageCleanupCard sessionToken={sessionToken || ''} />
        </TabsContent>

        <Button onClick={handleSave} disabled={saving} size="lg" className="w-full gap-2 mt-6">
          <Save className="h-5 w-5" />
          {saving ? 'Պահպանվում է...' : 'Պահպանել կարգավորումները'}
        </Button>
      </Tabs>
    </div>
  );
}

function FilterMigrationCard({ sessionToken }: { sessionToken: string }) {
  const [migrating, setMigrating] = useState(false);

  const handleMigrate = async () => {
    if (!confirm('Սա կգծանցի բոլոր ապրանքների ֆիլտր հատկանիշները նոր համակարգին:\n\nՑանց ընդհանուր սխալ առաջացի՞ք:')) {
      return;
    }

    setMigrating(true);
    try {
      const res = await fetch('/api/admin/migrate-filters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Migration failed');
      }

      const result = await res.json();
      toast.success(`Գծանցում հաջողված։ ${result.updated} ապրանք թարմացվել է`);
    } catch (error) {
      toast.error(`Գծանցում ձախողվեց։ ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setMigrating(false);
    }
  };

  return (
    <Card className="border-warning/50 bg-warning/5">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg text-warning">
          <Power className="h-5 w-5" />
          {'Ֆիլտրի համակարգ միգրացիա'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Արդիական ֆիլտրային համակարգը կօգտագործի ֆիլտրի ID-ը շարականմամբ, այլ ոչ թե slug-ը: Սա թույլ կտա անվտանգ փոփոխել ֆիլտրի անունը, առանց համակարգի խախտման:
        </p>
        <div className="bg-muted/50 p-3 rounded-lg text-xs">
          <p className="font-mono text-muted-foreground">
            Սա կվերանվանի բոլոր product.attributes բանալիները «slug» -ից «filter_id» -ի:
          </p>
        </div>
        <Button onClick={handleMigrate} disabled={migrating} className="w-full gap-2">
          <Power className="h-4 w-4" />
          {migrating ? 'Գծանցվում է...' : 'Գործարկել միգրացիա'}
        </Button>
      </CardContent>
    </Card>
  );
}

function NormalizeBrandsCard({ sessionToken }: { sessionToken: string }) {
  const normalize = useMutation(api.migrations.normalizeBrand);
  const [running, setRunning] = useState(false);
  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Նորմալացնել բրենդները</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">Համաժամացնի բոլոր ապրանքների brand արժեքը filterDef-ի options-ի հետ (case-insensitive)։ Օրինակ՝ HITO → Hito:</p>
        <Button disabled={running} onClick={async () => {
          setRunning(true);
          try { const r = await normalize({ sessionToken }); toast.success(String(r)); }
          catch (e) { toast.error(e instanceof Error ? e.message : 'Error'); }
          finally { setRunning(false); }
        }} className="w-full">{running ? 'Աշխատում է...' : 'Գործարկել'}</Button>
      </CardContent>
    </Card>
  );
}

function ImageCleanupCard({ sessionToken }: { sessionToken: string }) {
  const cleanup = useAction(api.r2Actions.cleanupImages);
  const [running, setRunning] = useState(false);
  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Մաքրել չօգտագործվող նկարները</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Կհեռացնի Cloudflare R2-ից այն նկարները, որոնք այլևս չեն օգտագործվում ոչ մի ապրանքում, կատեգորիայում, ակցիայում կամ էջում։ Պաշտպանված են hero/poster ֆայլերը և վերջին 7 օրում վերբեռնվածները։
        </p>
        <Button
          variant="destructive"
          disabled={running}
          onClick={async () => {
            setRunning(true);
            try {
              // 1. Preview how many would be removed.
              const preview = await cleanup({ sessionToken, apply: false });
              const count = (preview as { orphanCount?: number }).orphanCount ?? 0;
              const mb = (preview as { orphanMB?: number }).orphanMB ?? 0;
              if (count === 0) {
                toast.info('Չօգտագործվող նկարներ չկան');
                return;
              }
              if (!window.confirm(`Գտնվեց ${count} չօգտագործվող նկար (${mb} ՄԲ)։ Հեռացնե՞լ։`)) {
                return;
              }
              // 2. Apply deletion.
              const res = await cleanup({ sessionToken, apply: true });
              const deleted = (res as { deleted?: number }).deleted ?? 0;
              const freed = (res as { freedMB?: number }).freedMB ?? 0;
              toast.success(`Հեռացվեց ${deleted} նկար (${freed} ՄԲ)`);
            } catch (e) {
              toast.error(e instanceof Error ? e.message : 'Սխալ');
            } finally {
              setRunning(false);
            }
          }}
          className="w-full gap-2"
        >
          <Trash2 className="h-4 w-4" />
          {running ? 'Մաքրվում է...' : 'Հեռացնել նկարները'}
        </Button>
      </CardContent>
    </Card>
  );
}
