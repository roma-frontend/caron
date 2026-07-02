import { describe, it, expect } from 'vitest';
import {
  formatPrice,
  discountPercent,
  formatDateHy,
  formatDateLocalized,
  localizeDeliveryEstimate,
} from './formatters';

describe('formatPrice', () => {
  it('formats a price in AMD with the currency symbol and no fraction digits', () => {
    const out = formatPrice(1000);
    expect(out).toContain('֏');
    expect(out).toContain('000');
    expect(out).not.toContain('.');
  });

  it('formats zero', () => {
    const out = formatPrice(0);
    expect(out).toContain('0');
    expect(out).toContain('֏');
  });

  it('rounds fractional input (no fraction digits)', () => {
    // maximumFractionDigits: 0 => rounds to nearest integer
    expect(formatPrice(1234.56)).not.toMatch(/[.,]\d/);
  });
});

describe('discountPercent', () => {
  it('computes the discount percentage', () => {
    expect(discountPercent(80, 100)).toBe(20);
    expect(discountPercent(50, 200)).toBe(75);
  });

  it('returns 0 when there is no discount', () => {
    expect(discountPercent(100, 100)).toBe(0);
  });

  it('rounds to the nearest integer', () => {
    // 1 - 66/99 = 0.3333 -> 33
    expect(discountPercent(66, 99)).toBe(33);
  });
});

describe('formatDateHy', () => {
  it('formats a timestamp with the Armenian month name', () => {
    // Use local date components to avoid timezone drift.
    const ts = new Date(2024, 0, 15).getTime(); // January
    expect(formatDateHy(ts)).toBe('15 Հունվար 2024');
  });

  it('handles December (last month index)', () => {
    const ts = new Date(2023, 11, 31).getTime();
    expect(formatDateHy(ts)).toBe('31 Դեկտեմբեր 2023');
  });
});

describe('formatDateLocalized', () => {
  it('uses the provided translator for the month', () => {
    const t = (key: string) => `[${key}]`;
    const ts = new Date(2024, 4, 9).getTime(); // May -> month_5
    expect(formatDateLocalized(ts, t)).toBe('9 [cmp.month_5] 2024');
  });
});

describe('localizeDeliveryEstimate', () => {
  it('returns empty string for null/undefined/empty', () => {
    expect(localizeDeliveryEstimate(undefined, 'ru')).toBe('');
    expect(localizeDeliveryEstimate(null, 'en')).toBe('');
    expect(localizeDeliveryEstimate('', 'ru')).toBe('');
  });

  it('returns text unchanged for Armenian', () => {
    expect(localizeDeliveryEstimate('2-3 աշխատանքային օր', 'hy')).toBe('2-3 աշխատանքային օր');
  });

  it('translates Armenian day words to Russian', () => {
    expect(localizeDeliveryEstimate('2-3 աշխատանքային օր', 'ru')).toBe('2-3 рабочих дней');
  });

  it('translates Armenian day words to English', () => {
    expect(localizeDeliveryEstimate('2-3 աշխատանքային օր', 'en')).toBe('2-3 business days');
  });

  it('translates the plural "օրեր" form', () => {
    expect(localizeDeliveryEstimate('5 օրեր', 'ru')).toBe('5 дней');
    expect(localizeDeliveryEstimate('5 օրեր', 'en')).toBe('5 days');
  });
});
