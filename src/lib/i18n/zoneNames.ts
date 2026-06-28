'use client';

import { useT } from '@/lib/i18n/admin';
import type { AdminLang } from '@/store/adminLang';

type Tr = { ru: string; en: string };

/**
 * Delivery-zone (Yerevan districts + Armenian provinces) name translations,
 * keyed by the Armenian source name. Place names use standard Russian/English
 * exonyms / transliteration (NOT literal translation), so a curated map is more
 * reliable than an LLM here. Unknown custom zones fall back to the Armenian name.
 */
const ZONE_NAME_MAP: Record<string, Tr> = {
  // ─── Yerevan districts ───
  'Կենտրոն': { ru: 'Кентрон', en: 'Kentron' },
  'Արաբկիր': { ru: 'Арабкир', en: 'Arabkir' },
  'Քանաքեռ-Զեյթուն': { ru: 'Канакер-Зейтун', en: 'Kanaker-Zeytun' },
  'Ավան': { ru: 'Аван', en: 'Avan' },
  'Նոր Նորք': { ru: 'Нор-Норк', en: 'Nor Nork' },
  'Էրեբունի': { ru: 'Эребуни', en: 'Erebuni' },
  'Երեբունի': { ru: 'Эребуни', en: 'Erebuni' },
  'Շենգավիթ': { ru: 'Шенгавит', en: 'Shengavit' },
  'Մալաթիա-Սեբաստիա': { ru: 'Малатия-Себастия', en: 'Malatia-Sebastia' },
  'Աջափնյակ': { ru: 'Аджапняк', en: 'Ajapnyak' },
  'Դավթաշեն': { ru: 'Давташен', en: 'Davtashen' },
  'Նուբարաշեն': { ru: 'Нубарашен', en: 'Nubarashen' },
  'Նորք-Մարաշ': { ru: 'Норк-Мараш', en: 'Nork-Marash' },

  // ─── Provinces (marz) ───
  'Արագածոտնի մարզ': { ru: 'Арагацотнская область', en: 'Aragatsotn Province' },
  'Արարատի մարզ': { ru: 'Араратская область', en: 'Ararat Province' },
  'Արմավիրի մարզ': { ru: 'Армавирская область', en: 'Armavir Province' },
  'Գեղարքունիքի մարզ': { ru: 'Гехаркуникская область', en: 'Gegharkunik Province' },
  'Կոտայքի մարզ': { ru: 'Котайкская область', en: 'Kotayk Province' },
  'Լոռու մարզ': { ru: 'Лорийская область', en: 'Lori Province' },
  'Շիրակի մարզ': { ru: 'Ширакская область', en: 'Shirak Province' },
  'Սյունիքի մարզ': { ru: 'Сюникская область', en: 'Syunik Province' },
  'Վայոց ձորի մարզ': { ru: 'Вайоцдзорская область', en: 'Vayots Dzor Province' },
  'Տավուշի մարզ': { ru: 'Тавушская область', en: 'Tavush Province' },
};

/** Case-insensitive lookup map (Armenian casing of letters like ձ/Ձ varies). */
const ZONE_NAME_LC: Record<string, Tr> = Object.fromEntries(
  Object.entries(ZONE_NAME_MAP).map(([k, v]) => [k.toLowerCase(), v]),
);

/** Localize a delivery-zone name; falls back to the Armenian source. */
export function localizeZoneName(name: string, lang: AdminLang): string {
  if (lang === 'hy' || !name) return name;
  const key = name.trim();
  return (ZONE_NAME_MAP[key] ?? ZONE_NAME_LC[key.toLowerCase()])?.[lang] ?? name;
}

/** Hook returning a `zoneName(name)` function bound to the current UI language. */
export function useZoneName(): (name: string) => string {
  const { lang } = useT();
  return (name: string) => localizeZoneName(name, lang);
}
