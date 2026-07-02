import { describe, it, expect } from 'vitest';
import { pickLocalized, pickPromoTemplateJson } from './localize';

describe('pickLocalized', () => {
  const obj = { name: 'Անուն', nameRu: 'Имя', nameEn: 'Name' };

  it('returns the Armenian base field for hy', () => {
    expect(pickLocalized(obj, 'name', 'hy')).toBe('Անուն');
  });

  it('returns the localized field for ru/en', () => {
    expect(pickLocalized(obj, 'name', 'ru')).toBe('Имя');
    expect(pickLocalized(obj, 'name', 'en')).toBe('Name');
  });

  it('falls back to the base field when localized is missing', () => {
    expect(pickLocalized({ name: 'Անուն' }, 'name', 'ru')).toBe('Անուն');
  });

  it('falls back to the base field when localized is blank/whitespace', () => {
    expect(pickLocalized({ name: 'Անուն', nameRu: '   ' }, 'name', 'ru')).toBe('Անուն');
  });

  it('returns empty string for null/undefined object', () => {
    expect(pickLocalized(null, 'name', 'ru')).toBe('');
    expect(pickLocalized(undefined, 'name', 'en')).toBe('');
  });

  it('returns empty string when base field is not a string', () => {
    expect(pickLocalized({ name: 42 }, 'name', 'ru')).toBe('');
    expect(pickLocalized({}, 'name', 'hy')).toBe('');
  });
});

describe('pickPromoTemplateJson', () => {
  const promo = { templateJson: '{"hy":1}', templateJsonRu: '{"ru":1}', templateJsonEn: '{"en":1}' };

  it('returns the base template for hy', () => {
    expect(pickPromoTemplateJson(promo, 'hy')).toBe('{"hy":1}');
  });

  it('returns the localized template for ru/en', () => {
    expect(pickPromoTemplateJson(promo, 'ru')).toBe('{"ru":1}');
    expect(pickPromoTemplateJson(promo, 'en')).toBe('{"en":1}');
  });

  it('falls back to the base template when localized is missing/blank', () => {
    expect(pickPromoTemplateJson({ templateJson: '{"hy":1}' }, 'ru')).toBe('{"hy":1}');
    expect(pickPromoTemplateJson({ templateJson: '{"hy":1}', templateJsonEn: '  ' }, 'en')).toBe('{"hy":1}');
  });

  it('returns undefined for null/undefined promo', () => {
    expect(pickPromoTemplateJson(null, 'ru')).toBeUndefined();
    expect(pickPromoTemplateJson(undefined, 'hy')).toBeUndefined();
  });
});
