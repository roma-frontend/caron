import { describe, it, expect } from 'vitest';
import { localizeZoneName } from './zoneNames';

describe('localizeZoneName', () => {
  it('returns the Armenian name for hy', () => {
    expect(localizeZoneName('Կենտրոն', 'hy')).toBe('Կենտրոն');
  });

  it('returns empty/falsy names unchanged', () => {
    expect(localizeZoneName('', 'ru')).toBe('');
  });

  it('translates Yerevan districts to ru/en', () => {
    expect(localizeZoneName('Կենտրոն', 'ru')).toBe('Кентрон');
    expect(localizeZoneName('Կենտրոն', 'en')).toBe('Kentron');
    expect(localizeZoneName('Արաբկիր', 'en')).toBe('Arabkir');
  });

  it('translates provinces (marz)', () => {
    expect(localizeZoneName('Կոտայքի մարզ', 'ru')).toBe('Котайкская область');
    expect(localizeZoneName('Կոտայքի մարզ', 'en')).toBe('Kotayk Province');
  });

  it('trims surrounding whitespace before lookup', () => {
    expect(localizeZoneName('  Կենտրոն  ', 'en')).toBe('Kentron');
  });

  it('is case-insensitive via the lowercase fallback map', () => {
    expect(localizeZoneName('Վայոց ձորի մարզ', 'en')).toBe('Vayots Dzor Province');
  });

  it('falls back to the Armenian source for unknown zones', () => {
    expect(localizeZoneName('Անհայտ Գյուղ', 'ru')).toBe('Անհայտ Գյուղ');
  });
});
