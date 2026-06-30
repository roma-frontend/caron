// Pure, shared delivery-quote logic. Used by the public `quoteDelivery` query
// (for live checkout/calculator display) AND by `orders.create` (authoritative
// server-side recompute). Keeping it pure makes the price impossible to spoof
// from the client and guarantees the preview matches the charged amount.

export type ZoneLike = {
  _id: string;
  group: 'yerevan' | 'region';
  price?: number;
  freeThreshold?: number;
};

export type RuleLike = {
  _id: string;
  name: string;
  isActive: boolean;
  priority: number;
  group?: 'yerevan' | 'region';
  zoneIds?: string[];
  weekdays?: number[];
  dateFrom?: number;
  dateTo?: number;
  minOrderTotal?: number;
  effectType: 'free' | 'fixed' | 'percent';
  effectValue?: number;
  note?: string;
  noteRu?: string;
  noteEn?: string;
};

export type QuoteSettings = {
  deliveryYerevan?: number;
  deliveryRegions?: number;
  freeShippingThreshold?: number;
};

export type DeliveryQuote = {
  base: number;
  price: number;
  free: boolean;
  appliedRule: RuleLike | null;
};

/** Day of week (0=Sun … 6=Sat) in Asia/Yerevan (UTC+4, no DST). */
export function yerevanWeekday(at: number): number {
  return new Date(at + 4 * 60 * 60 * 1000).getUTCDay();
}

function ruleMatches(
  rule: RuleLike,
  ctx: { zoneId?: string; group?: 'yerevan' | 'region'; weekday: number; at: number; subtotal: number },
): boolean {
  if (!rule.isActive) return false;
  if (rule.group && rule.group !== ctx.group) return false;
  if (rule.zoneIds && rule.zoneIds.length > 0) {
    if (!ctx.zoneId || !rule.zoneIds.includes(ctx.zoneId)) return false;
  }
  if (rule.weekdays && rule.weekdays.length > 0 && !rule.weekdays.includes(ctx.weekday)) return false;
  if (typeof rule.dateFrom === 'number' && ctx.at < rule.dateFrom) return false;
  if (typeof rule.dateTo === 'number' && ctx.at > rule.dateTo) return false;
  if (typeof rule.minOrderTotal === 'number' && ctx.subtotal < rule.minOrderTotal) return false;
  return true;
}

/**
 * Compute the delivery price for a given zone/group, order subtotal and time.
 * Order of precedence:
 *  1. base = zone.price (fallback to the legacy per-group settings price)
 *  2. free-shipping threshold (per-zone overrides global) → price 0
 *  3. first matching active rule (by priority asc) overrides everything
 */
export function computeDeliveryQuote(input: {
  zone?: ZoneLike | null;
  group?: 'yerevan' | 'region';
  subtotal: number;
  at: number;
  settings: QuoteSettings | null | undefined;
  rules: RuleLike[];
}): DeliveryQuote {
  const { zone, subtotal, at, settings, rules } = input;
  const group = zone?.group ?? input.group ?? 'yerevan';

  const base =
    typeof zone?.price === 'number'
      ? zone.price
      : (group === 'region' ? settings?.deliveryRegions : settings?.deliveryYerevan) ?? 0;

  let price = base;
  let free = false;

  const threshold = zone?.freeThreshold ?? settings?.freeShippingThreshold ?? 0;
  if (threshold > 0 && subtotal >= threshold) {
    price = 0;
    free = true;
  }

  const weekday = yerevanWeekday(at);
  const sorted = [...rules].sort((a, b) => a.priority - b.priority);
  let appliedRule: RuleLike | null = null;
  for (const rule of sorted) {
    if (!ruleMatches(rule, { zoneId: zone?._id, group, weekday, at, subtotal })) continue;
    if (rule.effectType === 'free') {
      price = 0;
    } else if (rule.effectType === 'fixed') {
      price = Math.max(0, Math.round(rule.effectValue ?? 0));
    } else {
      // percent off the base price
      price = Math.max(0, Math.round(base * (1 - (rule.effectValue ?? 0) / 100)));
    }
    free = price === 0;
    appliedRule = rule;
    break;
  }

  return { base, price, free, appliedRule };
}

/** Pick the localized customer-facing note for a rule. */
export function ruleNote(rule: RuleLike | null, lang: 'hy' | 'ru' | 'en'): string {
  if (!rule) return '';
  if (lang === 'ru') return rule.noteRu || rule.note || '';
  if (lang === 'en') return rule.noteEn || rule.note || '';
  return rule.note || '';
}

/**
 * Best-effort detection of the delivery zone from a free-text address, by
 * matching each zone's keywords (or its name) as a case-insensitive substring.
 * Returns the matched zone id or null. Used to pre-select the zone in checkout.
 */
export function detectZoneId(
  address: string,
  zones: Array<{ _id: string; name: string; keywords?: string[]; isActive?: boolean }>,
): string | null {
  const hay = address.trim().toLowerCase();
  if (!hay) return null;
  let best: { id: string; len: number } | null = null;
  for (const z of zones) {
    if (z.isActive === false) continue;
    const needles = [z.name, ...(z.keywords ?? [])].map((s) => s.trim().toLowerCase()).filter(Boolean);
    for (const n of needles) {
      if (n.length >= 3 && hay.includes(n)) {
        // Prefer the longest match (most specific).
        if (!best || n.length > best.len) best = { id: z._id, len: n.length };
      }
    }
  }
  return best?.id ?? null;
}
