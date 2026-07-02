import { describe, it, expect } from 'vitest';
import { resolveCashback, type LoyaltyTier } from './loyalty';

const tiers: LoyaltyTier[] = [
  { minQty: 10, percent: 3 },
  { minQty: 50, percent: 5 },
];

describe('resolveCashback (RANGE model)', () => {
  it('uses base percent below the first threshold', () => {
    const r = resolveCashback(9, 10000, tiers, 0);
    expect(r.percent).toBe(0);
    expect(r.points).toBe(0);
  });

  it('applies the tier at its threshold', () => {
    const r = resolveCashback(10, 10000, tiers, 0);
    expect(r.percent).toBe(3);
    expect(r.points).toBe(300);
  });

  it('steps up to the highest matching tier', () => {
    const r = resolveCashback(50, 10000, tiers, 0);
    expect(r.percent).toBe(5);
    expect(r.points).toBe(500);
  });

  it('is constant within a range and points scale with amount', () => {
    expect(resolveCashback(25, 20000, tiers, 0)).toEqual({ percent: 3, points: 600 });
    expect(resolveCashback(49, 5000, tiers, 0)).toEqual({ percent: 3, points: 150 });
  });

  it('honours base percent when no tiers', () => {
    expect(resolveCashback(1, 10000, undefined, 2)).toEqual({ percent: 2, points: 200 });
  });

  it('rounds points to the nearest integer', () => {
    // 3% of 333 = 9.99 → 10
    expect(resolveCashback(10, 333, tiers, 0).points).toBe(10);
  });

  it('ignores tiers with non-positive minQty', () => {
    const bad: LoyaltyTier[] = [{ minQty: 0, percent: 99 }];
    expect(resolveCashback(100, 1000, bad, 1).percent).toBe(1);
  });
});
