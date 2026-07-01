'use client';

import { useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { useAuth } from '@/store/auth';
import { useAdminT } from '@/lib/i18n/admin';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Loader } from '@/components/ui/loader';
import { formatDateLocalized } from '@/lib/formatters';
import { toast } from 'sonner';
import { ShieldCheck, ShieldAlert, Users, Lock, Activity, ScrollText, Crown, Shield } from 'lucide-react';

type Role = 'admin' | 'manager';

function StatCard({ icon: Icon, label, value, tone = 'primary' }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number | string; tone?: 'primary' | 'amber' | 'emerald' | 'purple' }) {
  const tones: Record<string, string> = {
    primary: 'from-primary/15 to-primary/5 text-primary',
    amber: 'from-amber-500/15 to-amber-500/5 text-amber-600 dark:text-amber-400',
    emerald: 'from-emerald-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-400',
    purple: 'from-purple-500/15 to-purple-500/5 text-purple-600 dark:text-purple-400',
  };
  return (
    <Card className="overflow-hidden border-border/60">
      <CardContent className="flex items-center gap-4 p-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${tones[tone]}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function RoleIcon({ role }: { role: string }) {
  if (role === 'superadmin') return <Crown className="h-3.5 w-3.5 text-amber-500" />;
  if (role === 'admin') return <ShieldCheck className="h-3.5 w-3.5 text-purple-500" />;
  if (role === 'manager') return <Shield className="h-3.5 w-3.5 text-blue-500" />;
  return null;
}

export default function ControlCenterPage() {
  const { t } = useAdminT();
  const { user, sessionToken, hydrated } = useAuth();
  const isSuperadmin = user?.role === 'superadmin';
  const args = isSuperadmin && sessionToken ? { sessionToken } : 'skip';

  const stats = useQuery(api.access.getControlStats, args);
  const matrixData = useQuery(api.access.getAccessMatrix, args);
  const audit = useQuery(api.access.listAudit, isSuperadmin && sessionToken ? { sessionToken, limit: 60 } : 'skip');
  const staff = useQuery(api.access.listStaff, args);
  const setCapability = useMutation(api.access.setCapability);

  const grouped = useMemo(() => {
    const caps = matrixData?.capabilities ?? [];
    return {
      nav: caps.filter((c) => c.kind === 'nav'),
      action: caps.filter((c) => c.kind === 'action'),
    };
  }, [matrixData]);

  if (!hydrated) return <div className="flex min-h-[50vh] items-center justify-center"><Loader /></div>;

  if (!isSuperadmin) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <ShieldAlert className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="text-xl font-semibold">{t('sc.noAccessTitle')}</h1>
        <p className="max-w-sm text-sm text-muted-foreground">{t('sc.noAccessDesc')}</p>
      </div>
    );
  }

  const toggle = async (role: Role, capability: string, next: boolean) => {
    try {
      await setCapability({ sessionToken: sessionToken!, role, capability, enabled: next });
      toast.success(t('sc.capSaved'));
    } catch {
      toast.error(t('sc.capError'));
    }
  };

  const renderRow = (cap: { key: string; kind: string }) => {
    const adminOn = matrixData?.matrix.admin?.[cap.key] ?? true;
    const managerOn = matrixData?.matrix.manager?.[cap.key] ?? true;
    return (
      <div key={cap.key} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-border/40 px-4 py-2.5 last:border-0 hover:bg-muted/30">
        <span className="text-sm font-medium">{t(`sc.cap.${cap.key}`)}</span>
        <div className="flex w-16 justify-center">
          <Switch checked={adminOn} onCheckedChange={(v: boolean) => toggle('admin', cap.key, v)} />
        </div>
        <div className="flex w-16 justify-center">
          <Switch checked={managerOn} onCheckedChange={(v: boolean) => toggle('manager', cap.key, v)} />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-purple-500/20">
            <Crown className="h-5 w-5 text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{t('sc.title')}</h1>
        </div>
        <p className="text-sm text-muted-foreground">{t('sc.subtitle')}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard icon={Crown} tone="amber" label={t('sc.statSuperadmins')} value={stats?.superadmins ?? '—'} />
        <StatCard icon={ShieldCheck} tone="purple" label={t('sc.statAdmins')} value={stats?.admins ?? '—'} />
        <StatCard icon={Users} tone="primary" label={t('sc.statManagers')} value={stats?.managers ?? '—'} />
        <StatCard icon={Lock} tone="amber" label={t('sc.statRestrictions')} value={stats?.activeRestrictions ?? '—'} />
        <StatCard icon={Activity} tone="emerald" label={t('sc.statAudit24h')} value={stats?.auditLast24h ?? '—'} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        {/* Access matrix */}
        <Card className="border-border/60">
          <CardContent className="p-0">
            <div className="border-b px-4 py-3">
              <h2 className="flex items-center gap-2 font-semibold"><Lock className="h-4 w-4 text-primary" /> {t('sc.accessMatrix')}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{t('sc.accessMatrixHint')}</p>
            </div>
            {/* Column headers */}
            <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b bg-muted/40 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <span>{t('sc.capability')}</span>
              <span className="flex w-16 items-center justify-center gap-1"><ShieldCheck className="h-3 w-3 text-purple-500" />{t('sc.statAdmins')}</span>
              <span className="flex w-16 items-center justify-center gap-1"><Shield className="h-3 w-3 text-blue-500" />{t('sc.statManagers')}</span>
            </div>
            {matrixData === undefined ? (
              <div className="py-10"><Loader /></div>
            ) : (
              <>
                <p className="px-4 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">{t('sc.sections')}</p>
                {grouped.nav.map(renderRow)}
                <p className="px-4 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">{t('sc.actions')}</p>
                {grouped.action.map(renderRow)}
              </>
            )}
          </CardContent>
        </Card>

        {/* Right column: staff + audit */}
        <div className="space-y-6">
          <Card className="border-border/60">
            <CardContent className="p-0">
              <div className="border-b px-4 py-3"><h2 className="flex items-center gap-2 font-semibold"><Users className="h-4 w-4 text-primary" /> {t('sc.staff')}</h2></div>
              <div className="max-h-[240px] overflow-y-auto">
                {(staff ?? []).map((s) => (
                  <div key={s._id} className="flex items-center gap-3 border-b border-border/40 px-4 py-2.5 last:border-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{s.name.charAt(0).toUpperCase()}</div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{s.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{s.email}</p>
                    </div>
                    <Badge variant="secondary" className="gap-1 text-[10px]"><RoleIcon role={s.role} />{s.role}</Badge>
                    {!s.isActive && <span className="h-2 w-2 rounded-full bg-destructive" title="blocked" />}
                  </div>
                ))}
                {staff === undefined && <div className="py-8"><Loader /></div>}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardContent className="p-0">
              <div className="border-b px-4 py-3"><h2 className="flex items-center gap-2 font-semibold"><ScrollText className="h-4 w-4 text-primary" /> {t('sc.auditFeed')}</h2></div>
              <div className="max-h-[420px] overflow-y-auto">
                {audit === undefined ? (
                  <div className="py-8"><Loader /></div>
                ) : audit.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-muted-foreground">{t('sc.auditEmpty')}</p>
                ) : (
                  audit.map((e) => (
                    <div key={e._id} className="border-b border-border/40 px-4 py-2.5 last:border-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">{e.action}</span>
                        <span className="shrink-0 text-[10px] text-muted-foreground">{formatDateLocalized(e.createdAt, t)}</span>
                      </div>
                      <p className="mt-1 text-sm">{e.summary}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground"><RoleIcon role={e.actorRole} />{e.actorName}</p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
