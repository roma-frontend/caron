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

export default crons;
