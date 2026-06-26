'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery } from 'convex/react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import {
  LogOut, KeyRound, Sun, Moon, Monitor, ExternalLink, HelpCircle, Search,
  Plus, Package, FolderTree, Ticket, ShoppingBag, RotateCcw,
  MessageCircleQuestion, Star, Warehouse, ChevronRight, ShieldCheck, CheckCircle2, Languages,
} from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useAdminT, ADMIN_LANGS, adminLangLabel, type AdminTFn } from '@/lib/i18n/admin';

interface AdminUser {
  name: string;
  email: string;
  role: string;
}

interface AdminUserMenuProps {
  user: AdminUser;
  sessionToken: string | null;
  onLogout: () => void;
  /** Compact trigger (avatar only) for the mobile header. */
  compact?: boolean;
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

/**
 * Rich admin profile dropdown: a mini-dashboard ("needs attention" summary),
 * quick-create actions, global search launcher (⌘K), theme + language switch,
 * open-store link, password change and help — replacing the old email + logout
 * stub.
 */
export function AdminUserMenu({ user, sessionToken, onLogout, compact }: AdminUserMenuProps) {
  const { t } = useAdminT();
  const [open, setOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const counts = useQuery(api.admin.dashboardCounts, sessionToken ? { sessionToken } : 'skip');

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const attentionItems = counts
    ? [
        { key: 'orders', label: t('attention.orders'), count: counts.pendingOrders, href: '/admin/orders', icon: ShoppingBag },
        { key: 'returns', label: t('attention.returns'), count: counts.pendingReturns, href: '/admin/returns', icon: RotateCcw },
        { key: 'questions', label: t('attention.questions'), count: counts.unansweredQuestions, href: '/admin/qa', icon: MessageCircleQuestion },
        { key: 'reviews', label: t('attention.reviews'), count: counts.pendingReviews, href: '/admin/reviews', icon: Star },
        { key: 'out', label: t('attention.outOfStock'), count: counts.outOfStock, href: '/admin/stock', icon: Warehouse },
        { key: 'low', label: t('attention.lowStock'), count: counts.lowStock, href: '/admin/stock', icon: Warehouse },
      ].filter((i) => i.count > 0)
    : [];
  const attentionTotal = attentionItems.reduce((s, i) => s + i.count, 0);

  const quickActions = [
    { label: t('menu.newProduct'), href: '/admin/products/add', icon: Package },
    { label: t('menu.newCategory'), href: '/admin/categories/add', icon: FolderTree },
    { label: t('menu.coupon'), href: '/admin/promotions/coupons', icon: Ticket },
  ];

  const close = () => setOpen(false);
  const openSearch = () => {
    close();
    window.dispatchEvent(new Event('caron:open-command-palette'));
  };

  return (
    <div className="relative" ref={rootRef}>
      {/* Trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={t('menu.profile')}
        aria-expanded={open}
        className={cn(
          'relative flex items-center gap-2 rounded-lg transition-colors hover:bg-accent',
          compact ? 'h-9 w-9 justify-center rounded-full bg-primary/10 text-xs font-bold text-primary hover:bg-accent' : 'px-2 py-1.5',
        )}
      >
        <span className={cn('flex items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary', compact ? 'h-9 w-9' : 'h-7 w-7')}>
          {user.name.charAt(0).toUpperCase()}
        </span>
        {!compact && <span className="text-sm font-medium">{user.name}</span>}
        {attentionTotal > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-white">
            {attentionTotal > 99 ? '99+' : attentionTotal}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl border bg-popover shadow-xl"
          style={{ animation: 'fadeIn 0.12s ease' }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 border-b bg-muted/40 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-sm font-semibold">{user.name}</p>
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                  <ShieldCheck className="h-3 w-3" />
                  {user.role === 'admin' ? t('menu.admin') : user.role}
                </span>
              </div>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <div className="max-h-[70vh] overflow-y-auto p-1.5">
            {/* Needs attention */}
            <div className="px-2 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t('menu.attention')}
            </div>
            {counts === undefined ? (
              <div className="space-y-1 px-2 py-1">
                <div className="h-7 animate-pulse rounded-md bg-muted" />
                <div className="h-7 animate-pulse rounded-md bg-muted" />
              </div>
            ) : attentionItems.length === 0 ? (
              <div className="mx-1 mb-1 flex items-center gap-2 rounded-lg bg-emerald-500/10 px-2.5 py-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" /> {t('menu.allClear')}
              </div>
            ) : (
              attentionItems.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  onClick={close}
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-accent"
                >
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 truncate">{item.label}</span>
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-white">
                    {item.count}
                  </span>
                </Link>
              ))
            )}

            <div className="my-1.5 h-px bg-border" />

            {/* Quick actions */}
            <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t('menu.quickActions')}
            </div>
            <div className="grid grid-cols-3 gap-1 px-1 pb-1">
              {quickActions.map((qa) => (
                <Link
                  key={qa.href}
                  href={qa.href}
                  onClick={close}
                  className="flex flex-col items-center gap-1 rounded-lg border bg-card px-1 py-2 text-center text-[11px] font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <qa.icon className="h-3.5 w-3.5" />
                    <Plus className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-primary text-primary-foreground" />
                  </span>
                  {qa.label}
                </Link>
              ))}
            </div>

            <div className="my-1.5 h-px bg-border" />

            {/* Search launcher */}
            <button
              onClick={openSearch}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-accent"
            >
              <Search className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 text-left">{t('menu.search')}</span>
              <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {isMac ? '⌘K' : 'Ctrl K'}
              </kbd>
            </button>

            {/* Theme */}
            <ThemeRow t={t} />

            {/* Language */}
            <LangRow />

            {/* Open store */}
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              onClick={close}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-accent"
            >
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 text-left">{t('menu.openStore')}</span>
            </a>

            {/* Change password */}
            <button
              onClick={() => { close(); setPwOpen(true); }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-accent"
            >
              <KeyRound className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 text-left">{t('menu.changePassword')}</span>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </button>

            {/* Help */}
            <button
              onClick={() => { close(); setHelpOpen(true); }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-accent"
            >
              <HelpCircle className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 text-left">{t('menu.help')}</span>
            </button>

            <div className="my-1.5 h-px bg-border" />

            {/* Logout */}
            <button
              onClick={() => { close(); onLogout(); }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
              <span className="flex-1 text-left">{t('common.logout')}</span>
            </button>
          </div>
        </div>
      )}

      <ChangePasswordDialog open={pwOpen} onOpenChange={setPwOpen} sessionToken={sessionToken} />
      <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  );
}

/** Inline light / dark / system theme selector. */
function ThemeRow({ t }: { t: AdminTFn }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  const options = [
    { value: 'light', icon: Sun, label: t('menu.themeLight') },
    { value: 'dark', icon: Moon, label: t('menu.themeDark') },
    { value: 'system', icon: Monitor, label: t('menu.themeSystem') },
  ];

  return (
    <div className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm">
      <Sun className="h-4 w-4 text-muted-foreground" />
      <span className="flex-1">{t('menu.theme')}</span>
      <div className="flex items-center gap-0.5 rounded-lg border bg-muted/50 p-0.5">
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => setTheme(o.value)}
            aria-label={o.label}
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded-md transition-colors',
              mounted && theme === o.value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <o.icon className="h-3.5 w-3.5" />
          </button>
        ))}
      </div>
    </div>
  );
}

/** Inline HY / RU / EN language selector for the admin UI. */
function LangRow() {
  const { lang, setLang, t } = useAdminT();
  return (
    <div className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm">
      <Languages className="h-4 w-4 text-muted-foreground" />
      <span className="flex-1">{t('menu.language')}</span>
      <div className="flex items-center gap-0.5 rounded-lg border bg-muted/50 p-0.5">
        {ADMIN_LANGS.map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            className={cn(
              'flex h-6 min-w-7 items-center justify-center rounded-md px-1 text-[11px] font-semibold transition-colors',
              lang === l ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {adminLangLabel(l)}
          </button>
        ))}
      </div>
    </div>
  );
}

function ChangePasswordDialog({
  open, onOpenChange, sessionToken,
}: { open: boolean; onOpenChange: (v: boolean) => void; sessionToken: string | null }) {
  const { t } = useAdminT();
  const changePassword = useMutation(api.auth.changePassword);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => { setCurrent(''); setNext(''); setConfirm(''); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionToken) return;
    if (next.length < 8) { toast.error(t('pw.minLen')); return; }
    if (next !== confirm) { toast.error(t('pw.mismatch')); return; }
    setSubmitting(true);
    try {
      await changePassword({ sessionToken, currentPassword: current, newPassword: next });
      toast.success(t('pw.success'));
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('pw.error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('pw.title')}</DialogTitle>
          <DialogDescription>{t('pw.description')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="cp-current">{t('pw.current')}</Label>
            <Input id="cp-current" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cp-new">{t('pw.new')}</Label>
            <Input id="cp-new" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} required minLength={8} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cp-confirm">{t('pw.confirm')}</Label>
            <Input id="cp-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={submitting}>{submitting ? t('common.saving') : t('common.save')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function HelpDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { t } = useAdminT();
  const rows = [
    { keys: isMac ? '⌘ K' : 'Ctrl K', desc: t('help.searchShortcut') },
    { keys: 'Esc', desc: t('help.escShortcut') },
  ];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('help.title')}</DialogTitle>
          <DialogDescription>{t('help.description')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.keys} className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2 text-sm">
              <span className="text-muted-foreground">{r.desc}</span>
              <kbd className="rounded border bg-background px-2 py-0.5 text-xs font-medium">{r.keys}</kbd>
            </div>
          ))}
          <p className="pt-1 text-xs text-muted-foreground">{t('help.attentionNote')}</p>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>{t('common.gotIt')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
