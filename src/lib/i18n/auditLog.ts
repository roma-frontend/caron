import type { AdminTFn } from '@/lib/i18n/admin';

/**
 * Client-side localization of audit-log entries. Stored `summary` strings are
 * written in English at action time; here we reconstruct a localized sentence
 * from the stable `action` code plus structured `meta`, falling back to the
 * stored summary for any action we don't have a template for.
 */

const roleKey = (r: string): string =>
  r === 'superadmin' ? 'sc.roleSuperadmin'
    : r === 'admin' ? 'ac.roleAdmin'
      : r === 'manager' ? 'ac.roleManager'
        : 'ac.roleCustomer';

/** Translate with graceful fallback to the raw value when a key is missing. */
function tryT(t: AdminTFn, key: string, fallback: string): string {
  const v = t(key);
  return v === key ? fallback : v;
}

/** First quoted "..." substring of the English summary (the target's name). */
function quoted(summary: string): string {
  const m = summary.match(/"([^"]*)"/);
  return m ? m[1] : '';
}

/** Localized label for the small action chip. */
export function auditActionLabel(action: string, t: AdminTFn): string {
  return tryT(t, `al.${action}`, action);
}

/** Localized, human-readable description of an audit entry. */
export function auditText(
  entry: { action: string; summary: string; meta?: string | null },
  t: AdminTFn,
): string {
  let meta: Record<string, unknown> = {};
  try { if (entry.meta) meta = JSON.parse(entry.meta) as Record<string, unknown>; } catch { /* ignore */ }

  const name = quoted(entry.summary);
  const q = (s: string) => (s ? `«${s}»` : '');
  const roleLabel = (r: unknown) => (typeof r === 'string' ? t(roleKey(r)) : '');
  const capLabel = (c: unknown) => (typeof c === 'string' ? tryT(t, `sc.cap.${c}`, c) : '');
  const statusLabel = (s: unknown) => (typeof s === 'string' ? tryT(t, `ao.status.${s}`, s) : '');

  switch (entry.action) {
    case 'user.impersonate':
      return `${t('al.txt.impersonate')} ${q(name)}`;
    case 'access.setCapability': {
      const enabled = meta.enabled === true;
      return `${t(enabled ? 'al.txt.capEnabled' : 'al.txt.capDisabled')} ${q(capLabel(meta.capability))} · ${t('al.txt.forRole')} ${roleLabel(meta.role)}`;
    }
    case 'user.create':
      return `${t('al.txt.userCreate')} ${roleLabel(meta.role)} ${q(name)}`.replace(/\s+/g, ' ').trim();
    case 'user.roleChange':
      return `${t('al.txt.roleChange')} ${q(name)}${meta.to ? ` → ${roleLabel(meta.to)}` : ''}`;
    case 'user.passwordReset':
      return `${t('al.txt.passwordReset')} ${q(name)}`;
    case 'user.delete':
      return `${t('al.txt.userDelete')} ${q(name)}`;
    case 'product.delete':
      return `${t('al.txt.productDelete')} ${q(name)}`;
    case 'product.restore':
      return `${t('al.txt.productRestore')} ${q(name)}`;
    case 'product.purge':
      return `${t('al.txt.productPurge')} ${q(name)}`;
    case 'product.emptyTrash':
      return t('al.txt.emptyTrash');
    case 'session.revokeAll':
      return `${t('al.txt.revokeAll')} ${q(name)}`;
    case 'order.updateStatus':
      return `${t('al.txt.orderStatus')}: ${statusLabel(meta.prevStatus)} → ${statusLabel(meta.nextStatus)}`;
    case 'order.bulkAction':
      return `${t('al.txt.bulkOrders')}: ${typeof meta.count === 'number' ? meta.count : ''}${meta.status ? ` → ${statusLabel(meta.status)}` : ''}`;
    case 'settings.update':
      return t('al.txt.settingsUpdate');
    default:
      return entry.summary;
  }
}
