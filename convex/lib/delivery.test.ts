import { describe, it, expect } from 'vitest';
import { computeDeliveryQuote, yerevanWeekday, detectZoneId, ruleNote, type RuleLike, type ZoneLike } from './delivery';

const baseSettings = { deliveryYerevan: 1000, deliveryRegions: 2000, freeShippingThreshold: 0 };
const AT = Date.parse('2026-01-15T10:00:00Z'); // Thursday

describe('computeDeliveryQuote', () => {
  it('uses zone price as base', () => {
    const zone: ZoneLike = { _id: 'z1', group: 'yerevan', price: 700 };
    const q = computeDeliveryQuote({ zone, subtotal: 5000, at: AT, settings: baseSettings, rules: [] });
    expect(q.base).toBe(700);
    expect(q.price).toBe(700);
    expect(q.free).toBe(false);
  });

  it('falls back to per-group settings when zone has no price', () => {
    const q = computeDeliveryQuote({ group: 'region', subtotal: 100, at: AT, settings: baseSettings, rules: [] });
    expect(q.base).toBe(2000);
  });

  it('applies free-shipping threshold', () => {
    const zone: ZoneLike = { _id: 'z1', group: 'yerevan', price: 700, freeThreshold: 5000 };
    const q = computeDeliveryQuote({ zone, subtotal: 5000, at: AT, settings: baseSettings, rules: [] });
    expect(q.price).toBe(0);
    expect(q.free).toBe(true);
  });

  it('does not free-ship below threshold', () => {
    const zone: ZoneLike = { _id: 'z1', group: 'yerevan', price: 700, freeThreshold: 5000 };
    const q = computeDeliveryQuote({ zone, subtotal: 4999, at: AT, settings: baseSettings, rules: [] });
    expect(q.price).toBe(700);
  });

  it('a matching "free" rule overrides base', () => {
    const zone: ZoneLike = { _id: 'z1', group: 'yerevan', price: 700 };
    const rule: RuleLike = { _id: 'r1', name: 'free', isActive: true, priority: 1, effectType: 'free' };
    const q = computeDeliveryQuote({ zone, subtotal: 100, at: AT, settings: baseSettings, rules: [rule] });
    expect(q.price).toBe(0);
    expect(q.free).toBe(true);
    expect(q.appliedRule?._id).toBe('r1');
  });

  it('percent rule reduces base and rounds', () => {
    const zone: ZoneLike = { _id: 'z1', group: 'yerevan', price: 1000 };
    const rule: RuleLike = { _id: 'r1', name: '30off', isActive: true, priority: 1, effectType: 'percent', effectValue: 30 };
    const q = computeDeliveryQuote({ zone, subtotal: 100, at: AT, settings: baseSettings, rules: [rule] });
    expect(q.price).toBe(700);
  });

  it('fixed rule sets an explicit price', () => {
    const zone: ZoneLike = { _id: 'z1', group: 'yerevan', price: 1000 };
    const rule: RuleLike = { _id: 'r1', name: 'fixed', isActive: true, priority: 1, effectType: 'fixed', effectValue: 250 };
    const q = computeDeliveryQuote({ zone, subtotal: 100, at: AT, settings: baseSettings, rules: [rule] });
    expect(q.price).toBe(250);
  });

  it('lowest-priority rule wins and inactive rules are ignored', () => {
    const zone: ZoneLike = { _id: 'z1', group: 'yerevan', price: 1000 };
    const rules: RuleLike[] = [
      { _id: 'inactive', name: 'x', isActive: false, priority: 0, effectType: 'free' },
      { _id: 'r2', name: 'fixed500', isActive: true, priority: 2, effectType: 'fixed', effectValue: 500 },
      { _id: 'r1', name: 'fixed300', isActive: true, priority: 1, effectType: 'fixed', effectValue: 300 },
    ];
    const q = computeDeliveryQuote({ zone, subtotal: 100, at: AT, settings: baseSettings, rules });
    expect(q.appliedRule?._id).toBe('r1');
    expect(q.price).toBe(300);
  });

  it('rule with minOrderTotal only applies above the total', () => {
    const zone: ZoneLike = { _id: 'z1', group: 'yerevan', price: 1000 };
    const rule: RuleLike = { _id: 'r1', name: 'free>=3000', isActive: true, priority: 1, effectType: 'free', minOrderTotal: 3000 };
    expect(computeDeliveryQuote({ zone, subtotal: 2999, at: AT, settings: baseSettings, rules: [rule] }).price).toBe(1000);
    expect(computeDeliveryQuote({ zone, subtotal: 3000, at: AT, settings: baseSettings, rules: [rule] }).price).toBe(0);
  });

  it('weekday-scoped rule only applies on the listed day', () => {
    const zone: ZoneLike = { _id: 'z1', group: 'yerevan', price: 1000 };
    const wd = yerevanWeekday(AT);
    const other = (wd + 1) % 7;
    const rule: RuleLike = { _id: 'r1', name: 'wd', isActive: true, priority: 1, effectType: 'free', weekdays: [other] };
    expect(computeDeliveryQuote({ zone, subtotal: 100, at: AT, settings: baseSettings, rules: [rule] }).price).toBe(1000);
    const matchRule = { ...rule, weekdays: [wd] };
    expect(computeDeliveryQuote({ zone, subtotal: 100, at: AT, settings: baseSettings, rules: [matchRule] }).price).toBe(0);
  });
});

describe('yerevanWeekday', () => {
  it('maps to UTC+4 day of week', () => {
    // 2026-01-15T21:00Z is 2026-01-16T01:00 in Yerevan → Friday (5)
    expect(yerevanWeekday(Date.parse('2026-01-15T21:00:00Z'))).toBe(5);
  });
});

describe('detectZoneId', () => {
  const zones = [
    { _id: 'yer', name: 'Երևան', keywords: ['yerevan', 'ереван'] },
    { _id: 'gyu', name: 'Գյումրի', keywords: ['gyumri'] },
  ];
  it('matches by keyword, case-insensitive', () => {
    expect(detectZoneId('ul. Abovyan, Yerevan', zones)).toBe('yer');
    expect(detectZoneId('GYUMRI center', zones)).toBe('gyu');
  });
  it('returns null when nothing matches', () => {
    expect(detectZoneId('somewhere else', zones)).toBeNull();
    expect(detectZoneId('', zones)).toBeNull();
  });
});

describe('ruleNote', () => {
  const rule: RuleLike = { _id: 'r', name: 'n', isActive: true, priority: 1, effectType: 'free', note: 'HY', noteRu: 'RU', noteEn: 'EN' };
  it('picks the localized note with fallback', () => {
    expect(ruleNote(rule, 'ru')).toBe('RU');
    expect(ruleNote(rule, 'en')).toBe('EN');
    expect(ruleNote(rule, 'hy')).toBe('HY');
    expect(ruleNote({ ...rule, noteRu: undefined }, 'ru')).toBe('HY');
    expect(ruleNote(null, 'hy')).toBe('');
  });
});
