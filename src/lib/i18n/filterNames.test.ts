import { describe, it, expect } from 'vitest';
import { localizeFilterName, localizeFilterOption, localizeCategoryName } from './filterNames';

describe('localizeFilterName', () => {
  it('returns the Armenian name for hy (or slug fallback)', () => {
    expect(localizeFilterName('Բրենդ', 'hy', 'brand')).toBe('Բրենդ');
    expect(localizeFilterName('', 'hy', 'brand')).toBe('brand');
    expect(localizeFilterName('', 'hy')).toBe('');
  });

  it('prefers DB nameRu/nameEn when present', () => {
    expect(localizeFilterName('Բրենդ', 'ru', 'brand', 'DBru', 'DBen')).toBe('DBru');
    expect(localizeFilterName('Բրենդ', 'en', 'brand', 'DBru', 'DBen')).toBe('DBen');
  });

  it('ignores blank DB values and falls back to slug map', () => {
    expect(localizeFilterName('Բրենդ', 'ru', 'brand', '  ')).toBe('Бренд');
    expect(localizeFilterName('Բրենդ', 'en', 'brand')).toBe('Brand');
  });

  it('falls back to Armenian-name map when slug is unknown', () => {
    expect(localizeFilterName('Սեզոն', 'ru', 'custom_slug')).toBe('Сезон');
    expect(localizeFilterName('Սեզոն', 'en')).toBe('Season');
  });

  it('falls back to the raw name/slug when nothing matches', () => {
    expect(localizeFilterName('Անհայտ', 'ru', 'unknown')).toBe('Անհայտ');
    expect(localizeFilterName('', 'ru', 'unknown')).toBe('unknown');
  });
});

describe('localizeFilterOption', () => {
  it('returns the base option for hy', () => {
    expect(localizeFilterOption('Ամառ', 0, 'hy', ['Лето'], ['Summer'])).toBe('Ամառ');
  });

  it('returns the translated option by index for ru/en', () => {
    expect(localizeFilterOption('Ամառ', 0, 'ru', ['Лето'], ['Summer'])).toBe('Лето');
    expect(localizeFilterOption('Ամառ', 0, 'en', ['Лето'], ['Summer'])).toBe('Summer');
  });

  it('falls back to base option when translation array/index missing or blank', () => {
    expect(localizeFilterOption('Ամառ', 5, 'ru', ['Лето'])).toBe('Ամառ');
    expect(localizeFilterOption('Ամառ', 0, 'ru')).toBe('Ամառ');
    expect(localizeFilterOption('Ամառ', 0, 'ru', ['  '])).toBe('Ամառ');
  });
});

describe('localizeCategoryName', () => {
  it('handles string input with hy passthrough', () => {
    expect(localizeCategoryName('Յուղեր', 'hy')).toBe('Յուղեր');
    expect(localizeCategoryName('', 'ru')).toBe('');
  });

  it('translates a string category via the name map', () => {
    expect(localizeCategoryName('Յուղեր', 'ru')).toBe('Масла');
    expect(localizeCategoryName('Յուղեր', 'en')).toBe('Oils');
    expect(localizeCategoryName('Անհայտ', 'ru')).toBe('Անհայտ');
  });

  it('returns the Armenian name for hy on object input', () => {
    expect(localizeCategoryName({ name: 'Անվադողեր', slug: 'tires' }, 'hy')).toBe('Անվադողեր');
  });

  it('prefers DB nameRu/nameEn on object input', () => {
    expect(localizeCategoryName({ name: 'Անվադողեր', slug: 'tires', nameRu: 'DBru' }, 'ru')).toBe('DBru');
  });

  it('falls back to slug map, then name map', () => {
    expect(localizeCategoryName({ name: 'Անվադողեր', slug: 'tires' }, 'ru')).toBe('Шины');
    expect(localizeCategoryName({ name: 'Անվադողեր' }, 'en')).toBe('Tires');
  });

  it('falls back to the raw name when nothing matches', () => {
    expect(localizeCategoryName({ name: 'Անհայտ', slug: 'zzz' }, 'ru')).toBe('Անհայտ');
  });
});
