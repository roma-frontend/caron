'use client';

import { useAdminT } from '@/lib/i18n/admin';
import type { AdminLang } from '@/store/adminLang';

type Tr = { ru: string; en: string };

/**
 * Filter/attribute definition name translations keyed by the stable, language-
 * neutral `slug`. Slugs don't change (immutable in the DB), so this is the most
 * robust key — independent of whatever Armenian `name` the admin typed.
 */
const FILTER_SLUG_MAP: Record<string, Tr> = {
  brand: { ru: 'Бренд', en: 'Brand' },
  type: { ru: 'Тип', en: 'Type' },
  size: { ru: 'Размер', en: 'Size' },
  season: { ru: 'Сезон', en: 'Season' },
  width: { ru: 'Ширина', en: 'Width' },
  profile: { ru: 'Профиль', en: 'Profile' },
  diameter: { ru: 'Радиус', en: 'Diameter' },
  loadIndex: { ru: 'Индекс нагрузки', en: 'Load index' },
  speedIndex: { ru: 'Индекс скорости', en: 'Speed index' },
  runflat: { ru: 'Run-flat', en: 'Run-flat' },
  tireType: { ru: 'Тип', en: 'Type' },
  viscosity: { ru: 'Вязкость', en: 'Viscosity' },
  oilType: { ru: 'Тип', en: 'Type' },
  volume: { ru: 'Объём', en: 'Volume' },
  apiClass: { ru: 'Класс API', en: 'API class' },
  aceaClass: { ru: 'Класс ACEA', en: 'ACEA class' },
  approvals: { ru: 'Допуски производителя', en: 'Manufacturer approvals' },
  filterType: { ru: 'Тип фильтра', en: 'Filter type' },
  height: { ru: 'Высота', en: 'Height' },
  outerDiameter: { ru: 'Внешний диаметр', en: 'Outer diameter' },
  thread: { ru: 'Резьба', en: 'Thread' },
  brakeType: { ru: 'Тип', en: 'Type' },
  axle: { ru: 'Ось', en: 'Axle' },
  material: { ru: 'Материал', en: 'Material' },
  thickness: { ru: 'Толщина', en: 'Thickness' },
  lampType: { ru: 'Тип', en: 'Type' },
  socket: { ru: 'Цоколь', en: 'Socket' },
  kelvin: { ru: 'Цветовая температура', en: 'Color temperature' },
  voltage: { ru: 'Напряжение', en: 'Voltage' },
  wattage: { ru: 'Мощность', en: 'Wattage' },
  capacity: { ru: 'Ёмкость', en: 'Capacity' },
  tech: { ru: 'Технология', en: 'Technology' },
  polarity: { ru: 'Полярность', en: 'Polarity' },
  terminal: { ru: 'Тип клеммы', en: 'Terminal type' },
  accessoryType: { ru: 'Тип', en: 'Type' },
  color: { ru: 'Цвет', en: 'Color' },
  length: { ru: 'Длина', en: 'Length' },
  weight: { ru: 'Вес', en: 'Weight' },
  model: { ru: 'Модель', en: 'Model' },
  side: { ru: 'Сторона', en: 'Side' },
  position: { ru: 'Положение', en: 'Position' },
};

/** Secondary lookup by the Armenian source name (covers custom slugs). */
const FILTER_NAME_MAP: Record<string, Tr> = {
  'Բրենդ': { ru: 'Бренд', en: 'Brand' },
  'Անվանում': { ru: 'Название', en: 'Name' },
  'Տեսակ': { ru: 'Тип', en: 'Type' },
  'Տիպ': { ru: 'Тип', en: 'Type' },
  'Չափ': { ru: 'Размер', en: 'Size' },
  'Սեզոն': { ru: 'Сезон', en: 'Season' },
  'Լայնություն': { ru: 'Ширина', en: 'Width' },
  'Պրոֆիլ': { ru: 'Профиль', en: 'Profile' },
  'Ռադիուս': { ru: 'Радиус', en: 'Diameter' },
  'Մածուցիկություն': { ru: 'Вязкость', en: 'Viscosity' },
  'Ծավալ': { ru: 'Объём', en: 'Volume' },
  'Ֆիլտրի տեսակ': { ru: 'Тип фильтра', en: 'Filter type' },
  'Բարձրություն': { ru: 'Высота', en: 'Height' },
  'Թել': { ru: 'Резьба', en: 'Thread' },
  'Առանցք': { ru: 'Ось', en: 'Axle' },
  'Նյութ': { ru: 'Материал', en: 'Material' },
  'Հաստություն': { ru: 'Толщина', en: 'Thickness' },
  'Սոկետ': { ru: 'Цоколь', en: 'Socket' },
  'Գույնի ջերմաստիճան': { ru: 'Цветовая температура', en: 'Color temperature' },
  'Լարում': { ru: 'Напряжение', en: 'Voltage' },
  'Լարման': { ru: 'Напряжение', en: 'Voltage' },
  'Հզորություն': { ru: 'Мощность', en: 'Wattage' },
  'Տարողունակություն': { ru: 'Ёмкость', en: 'Capacity' },
  'Տեխնոլոգիա': { ru: 'Технология', en: 'Technology' },
  'Բևեռականություն': { ru: 'Полярность', en: 'Polarity' },
  'Գույն': { ru: 'Цвет', en: 'Color' },
};

/**
 * Category name translations keyed by stable `slug`, with an Armenian-name
 * secondary lookup. The DB `nameRu`/`nameEn` (when present) take priority.
 */
const CATEGORY_SLUG_MAP: Record<string, Tr> = {
  tires: { ru: 'Шины', en: 'Tires' },
  discs: { ru: 'Диски', en: 'Wheels' },
  oils: { ru: 'Масла', en: 'Oils' },
  filters: { ru: 'Фильтры', en: 'Filters' },
  brakes: { ru: 'Тормоза', en: 'Brakes' },
  lamps: { ru: 'Лампы', en: 'Lamps' },
  batteries: { ru: 'Аккумуляторы', en: 'Batteries' },
  accessories: { ru: 'Аксессуары', en: 'Accessories' },
};

const CATEGORY_NAME_MAP: Record<string, Tr> = {
  'Լամպեր': { ru: 'Лампы', en: 'Lamps' },
  'Ապակու Խոզանակներ': { ru: 'Щётки стеклоочистителя', en: 'Wiper blades' },
  'Ապակու խոզանակներ': { ru: 'Щётки стеклоочистителя', en: 'Wiper blades' },
  'Ավտոքիմիա': { ru: 'Автохимия', en: 'Auto chemicals' },
  'Բուրավետիչներ': { ru: 'Ароматизаторы', en: 'Air fresheners' },
  'Տյունինգային դետալներ': { ru: 'Тюнинг-детали', en: 'Tuning parts' },
  'Անիվներ': { ru: 'Шины', en: 'Tires' },
  'Անվադողեր': { ru: 'Шины', en: 'Tires' },
  'Դիսկեր': { ru: 'Диски', en: 'Wheels' },
  'Յուղեր': { ru: 'Масла', en: 'Oils' },
  'Նյութեր': { ru: 'Масла', en: 'Oils' },
  'Ֆիլտրեր': { ru: 'Фильтры', en: 'Filters' },
  'Արգելակներ': { ru: 'Тормоза', en: 'Brakes' },
  'Կոճղակ': { ru: 'Тормозные колодки', en: 'Brake pads' },
  'Կոճղակներ': { ru: 'Тормозные колодки', en: 'Brake pads' },
  'Մարտկոցներ': { ru: 'Аккумуляторы', en: 'Batteries' },
  'Բատարաններ': { ru: 'Аккумуляторы', en: 'Batteries' },
  'Աքսեսուարներ': { ru: 'Аксессуары', en: 'Accessories' },
};

/** Localize a filter/attribute name. Prefers DB nameRu/nameEn, then slug, then Armenian name. */
export function localizeFilterName(
  name: string,
  lang: AdminLang,
  slug?: string,
  nameRu?: string,
  nameEn?: string,
): string {
  if (lang === 'hy') return name || slug || '';
  const db = lang === 'ru' ? nameRu : nameEn;
  if (db && db.trim()) return db;
  if (slug && FILTER_SLUG_MAP[slug]) return FILTER_SLUG_MAP[slug][lang];
  const byName = name ? FILTER_NAME_MAP[name.trim()] : undefined;
  if (byName) return byName[lang];
  return name || slug || '';
}

/**
 * Localize a single filter option label for display. The base `option` value
 * is the canonical (Armenian) value used for filtering; `optionsRu`/`optionsEn`
 * are parallel arrays produced by the auto-translator. Falls back to the base
 * option when no translation is present.
 */
export function localizeFilterOption(
  option: string,
  index: number,
  lang: AdminLang,
  optionsRu?: string[],
  optionsEn?: string[],
): string {
  if (lang === 'hy') return option;
  const arr = lang === 'ru' ? optionsRu : optionsEn;
  const tr = arr?.[index];
  return tr && tr.trim() ? tr : option;
}

/** Localize a category name. Prefers DB nameRu/nameEn, then slug, then Armenian name. */
export function localizeCategoryName(
  cat: { name: string; slug?: string; nameRu?: string; nameEn?: string } | string,
  lang: AdminLang,
): string {
  if (typeof cat === 'string') {
    if (lang === 'hy' || !cat) return cat;
    return CATEGORY_NAME_MAP[cat.trim()]?.[lang] ?? cat;
  }
  if (lang === 'hy') return cat.name;
  const db = lang === 'ru' ? cat.nameRu : cat.nameEn;
  if (db && db.trim()) return db;
  if (cat.slug && CATEGORY_SLUG_MAP[cat.slug]) return CATEGORY_SLUG_MAP[cat.slug][lang];
  return CATEGORY_NAME_MAP[(cat.name ?? '').trim()]?.[lang] ?? cat.name;
}

/**
 * Hook returning a `filterName(name, slug?, nameRu?, nameEn?)` function bound to
 * the current UI language. Hydration-safe via {@link useAdminT} (Armenian until
 * mount). Pass the definition's DB translations to prefer them over the static
 * dictionary fallback.
 */
export function useFilterName(): (name: string, slug?: string, nameRu?: string, nameEn?: string) => string {
  const { lang } = useAdminT();
  return (name, slug, nameRu, nameEn) => localizeFilterName(name, lang, slug, nameRu, nameEn);
}

/**
 * Hook returning a `filterOption(option, index, optionsRu?, optionsEn?)`
 * function bound to the current UI language.
 */
export function useFilterOption(): (option: string, index: number, optionsRu?: string[], optionsEn?: string[]) => string {
  const { lang } = useAdminT();
  return (option, index, optionsRu, optionsEn) => localizeFilterOption(option, index, lang, optionsRu, optionsEn);
}

/** Hook returning a `categoryName(cat)` function bound to the current UI language. */
export function useCategoryName(): (cat: { name: string; slug?: string; nameRu?: string; nameEn?: string } | string) => string {
  const { lang } = useAdminT();
  return (cat) => localizeCategoryName(cat, lang);
}
