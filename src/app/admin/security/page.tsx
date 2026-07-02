'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { useAuth } from '@/store/auth';
import { useAdminT } from '@/lib/i18n/admin';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader } from '@/components/ui/loader';
import { ShieldCheck, ShieldOff, Copy, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import QRCode from 'qrcode';

export default function SecurityPage() {
  const { t } = useAdminT();
  const { sessionToken } = useAuth();
  const status = useQuery(api.twoFactor.status, sessionToken ? { sessionToken } : 'skip');
  const startSetup = useMutation(api.twoFactor.startSetup);
  const enable = useMutation(api.twoFactor.enable);
  const disable = useMutation(api.twoFactor.disable);

  const [secret, setSecret] = useState('');
  const [qr, setQr] = useState('');
  const [code, setCode] = useState('');
  const [recovery, setRecovery] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);

  const errCode = (e: unknown): string | undefined => {
    const data = (e as { data?: unknown })?.data;
    return typeof data === 'object' && data && 'code' in data ? String((data as { code: unknown }).code) : undefined;
  };

  const begin = async () => {
    setBusy(true);
    try {
      const r = await startSetup({ sessionToken: sessionToken! });
      setSecret(r.secret);
      try { setQr(await QRCode.toDataURL(r.uri, { width: 220, margin: 1 })); } catch { setQr(''); }
    }
    catch { toast.error(t('sec.error')); } finally { setBusy(false); }
  };
  const confirm = async () => {
    if (code.trim().length !== 6) { toast.error(t('sec.code6')); return; }
    setBusy(true);
    try {
      const r = await enable({ sessionToken: sessionToken!, code: code.trim() });
      setRecovery(r.recoveryCodes); setSecret(''); setQr(''); setCode('');
      toast.success(t('sec.enabled'));
    } catch (e) { toast.error(errCode(e) === 'INVALID_CODE' ? t('sec.codeInvalid') : t('sec.error')); }
    finally { setBusy(false); }
  };
  const turnOff = async () => {
    if (code.trim().length < 6) { toast.error(t('sec.codeToDisable')); return; }
    if (!window.confirm(t('sec.confirmDisable'))) return;
    setBusy(true);
    try { await disable({ sessionToken: sessionToken!, code: code.trim() }); setCode(''); toast.success(t('sec.disabled')); }
    catch (e) { toast.error(errCode(e) === 'INVALID_CODE' ? t('sec.codeInvalid') : t('sec.error')); }
    finally { setBusy(false); }
  };

  if (status === undefined) return <div className="flex min-h-[50vh] items-center justify-center"><Loader /></div>;

  return (
    <div className="max-w-xl space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight"><ShieldCheck className="h-6 w-6 text-primary" /> {t('sec.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('sec.subtitle')}</p>
      </div>

      {/* Recovery codes shown once after enabling */}
      {recovery && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="p-4">
            <h2 className="mb-2 flex items-center gap-2 font-semibold"><KeyRound className="h-4 w-4 text-amber-600" /> {t('sec.recoveryTitle')}</h2>
            <p className="mb-3 text-xs text-muted-foreground">{t('sec.recoveryHint')}</p>
            <div className="grid grid-cols-2 gap-2 font-mono text-sm">
              {recovery.map((c) => <div key={c} className="rounded bg-background px-2 py-1 text-center">{c}</div>)}
            </div>
            <Button variant="outline" size="sm" className="mt-3 gap-1.5" onClick={() => { navigator.clipboard.writeText(recovery.join('\n')); toast.success(t('sec.copied')); }}>
              <Copy className="h-3.5 w-3.5" /> {t('sec.copy')}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-5">
          {status.enabled ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-green-600"><ShieldCheck className="h-5 w-5" /> {t('sec.statusOn')}</div>
              <p className="text-xs text-muted-foreground">{t('sec.recoveryRemaining')}: {status.recoveryRemaining}</p>
              <div className="space-y-2">
                <Label>{t('sec.disableLabel')}</Label>
                <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" inputMode="numeric" className="h-10" />
              </div>
              <Button variant="destructive" className="gap-1.5" onClick={turnOff} disabled={busy}>
                <ShieldOff className="h-4 w-4" /> {t('sec.disable')}
              </Button>
            </div>
          ) : secret ? (
            <div className="space-y-4">
              <p className="text-sm">{t('sec.step2')}</p>
              {qr && (
                <div className="flex flex-col items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qr} alt="2FA QR" width={220} height={220} className="rounded-lg border bg-white p-2" />
                  <p className="text-xs text-muted-foreground">{t('sec.scanQr')}</p>
                </div>
              )}
              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="mb-1 text-xs text-muted-foreground">{t('sec.manualKey')}</p>
                <div className="flex items-center justify-between gap-2">
                  <code className="break-all text-sm font-semibold tracking-wide">{secret}</code>
                  <Button variant="ghost" size="icon-sm" onClick={() => { navigator.clipboard.writeText(secret); toast.success(t('sec.copied')); }}><Copy className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('sec.enterCode')}</Label>
                <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" inputMode="numeric" className="h-10 tracking-widest" autoFocus />
              </div>
              <Button className="gap-1.5" onClick={confirm} disabled={busy}><ShieldCheck className="h-4 w-4" /> {t('sec.confirmEnable')}</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><ShieldOff className="h-5 w-5" /> {t('sec.statusOff')}</div>
              <p className="text-sm text-muted-foreground">{t('sec.enableHint')}</p>
              <Button className="gap-1.5" onClick={begin} disabled={busy}><ShieldCheck className="h-4 w-4" /> {t('sec.enable')}</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
