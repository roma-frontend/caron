import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();

// Keep the OEM search index in sync automatically. `syncOemIndex` already
// maintains it on every product write, so this daily pass only heals products
// created before the index existed (or any rare gap). It is idempotent and
// becomes a cheap read-only scan once the catalog is fully indexed.
crons.daily(
  'backfill-oem-index',
  { hourUTC: 2, minuteUTC: 0 },
  internal.products.backfillOemIndex,
  {},
);

// Weekly cleanup of orphaned R2 images (not referenced by any document).
// Reuses the same safe audit (whitelists hero/poster, skips files < 7 days old).
crons.weekly(
  'cleanup-r2-orphans',
  { dayOfWeek: 'sunday', hourUTC: 3, minuteUTC: 0 },
  internal.r2Actions.auditOrphans,
  { apply: true, minAgeDays: 7 },
);

// Daily: deactivate promotions whose end date has passed.
crons.daily(
  'deactivate-expired-promotions',
  { hourUTC: 1, minuteUTC: 0 },
  internal.maintenance.deactivateExpiredPromotions,
  {},
);

// Daily: purge expired sessions and stale auth-attempt records.
crons.daily(
  'purge-stale-auth',
  { hourUTC: 1, minuteUTC: 30 },
  internal.maintenance.purgeStaleAuth,
  {},
);

// Daily: self-healing recompute of denormalized catalog stats (brand list +
// per-category counts). Product writes already keep it current; this heals any
// rare drift and covers data imported outside the normal write paths.
crons.daily(
  'recompute-catalog-stats',
  { hourUTC: 2, minuteUTC: 30 },
  internal.products.recomputeCatalogStatsCron,
  {},
);

// Daily: re-translate any product whose RU/EN name still has Armenian residue
// (self-heals rare import-time LLM failures so names don't stay half-translated).
crons.daily(
  'retranslate-armenian-residue',
  { hourUTC: 3, minuteUTC: 30 },
  internal.maintenance.retranslateArmenianResidue,
  { dryRun: false },
);

// Daily: permanently purge products that have sat in the trash > 30 days.
crons.daily(
  'purge-old-product-trash',
  { hourUTC: 4, minuteUTC: 0 },
  internal.products.purgeOldTrash,
  {},
);

// Daily: owner Telegram digest (revenue, orders, stock) — 06:00 Armenia time.
crons.daily(
  'owner-daily-digest',
  { hourUTC: 2, minuteUTC: 0 },
  internal.notifications.sendDailyDigest,
  {},
);

export default crons;
