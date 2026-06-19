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

export default crons;
