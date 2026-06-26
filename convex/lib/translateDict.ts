/**
 * Deterministic Armenian -> Russian / English translator for the formulaic
 * product & category names used in this auto-parts catalog.
 *
 * Why this exists: the LLM (llama-3.3-70b via Groq) is unreliable at Armenian.
 * It hallucinates ("фара" for windshield), transliterates ("Хозанак"), and is
 * rate-limited mid-backfill so items keep stale garbage. The catalog names,
 * however, are highly formulaic ("<part> <modifier> <brand> <size>"), so a
 * dictionary with longest-match-first phrase replacement is both far more
 * reliable AND fully unit-testable offline (no API key, no network).
 *
 * Strategy in the callers: run this first. If the result is `complete`
 * (no Armenian letters remain), store it and skip the LLM entirely. Only fall
 * back to the LLM for names this dictionary does not fully cover.
 *
 * This module is intentionally dependency-free and pure.
 */

export type DictResult = { ru: string; en: string; complete: boolean };

/** Armenian letters + the small punctuation marks that occur inside words. */
const A = '[\\u0531-\\u0556\\u0561-\\u0587\\u055A-\\u055F]';

type Entry = { re: RegExp; ru: string; en: string };

/** Build a case-insensitive, unicode, global regex from a source string. */
const rx = (src: string): RegExp => new RegExp(src, 'giu');

/**
 * Ordered replacement table. ORDER MATTERS:
 *  1. Longest / most specific phrases first (wiper + hybrid).
 *  2. Plural before singular (plural carries the extra "ներ" suffix that the
 *     singular stem would otherwise swallow).
 *  3. Multi-word part phrases before the bare nouns they contain
 *     ("Դիմապակու խոզանակ" = wiper blade must win over "Դիմապակ" = windshield).
 *  4. Bare nouns, then modifiers, then positions, then units.
 *
 * Stems are written lowercase; the `i` flag folds Armenian case, and `${A}*`
 * absorbs inflectional suffixes (genitive -ու, definite -ը/-ն, plural -ներ…).
 */
// NOTE: all RU/EN values are LOWERCASE. `tidy()` capitalizes only the first
// letter of the final string, so a noun reads "Щётка…" when it leads the name
// but "…фара" when it follows a position adjective ("Передняя фара левая").
const ENTRIES: Entry[] = [
  // ── Wiper blade + "hybrid" (combined, gives natural EN word order) ──────────
  {
    re: rx(`(?:դիմապակ|ապակ)${A}*\\s+խոզանակներ${A}*\\s+հիբրիդ${A}*`),
    ru: 'щётки стеклоочистителя гибридные',
    en: 'hybrid wiper blades',
  },
  {
    re: rx(`(?:դիմապակ|ապակ)${A}*\\s+խոզանակ${A}*\\s+հիբրիդ${A}*`),
    ru: 'щётка стеклоочистителя гибридная',
    en: 'hybrid wiper blade',
  },
  {
    re: rx(`խոզանակ${A}*\\s+հիբրիդ${A}*`),
    ru: 'щётка стеклоочистителя гибридная',
    en: 'hybrid wiper blade',
  },

  // ── Wiper blade (no modifier) ───────────────────────────────────────────────
  {
    re: rx(`(?:դիմապակ|ապակ)${A}*\\s+խոզանակներ${A}*`),
    ru: 'щётки стеклоочистителя',
    en: 'wiper blades',
  },
  {
    re: rx(`(?:դիմապակ|ապակ)${A}*\\s+խոզանակ${A}*`),
    ru: 'щётка стеклоочистителя',
    en: 'wiper blade',
  },
  { re: rx(`խոզանակներ${A}*`), ru: 'щётки стеклоочистителя', en: 'wiper blades' },
  { re: rx(`խոզանակ${A}*`), ru: 'щётка стеклоочистителя', en: 'wiper blade' },
  { re: rx(`ապակեմաքրիչ${A}*`), ru: 'щётка стеклоочистителя', en: 'wiper blade' },

  // ── Glass / windshield (only reached once the wiper phrases are consumed) ───
  { re: rx(`դիմապակ${A}*`), ru: 'лобовое стекло', en: 'windshield' },

  // ── Lights ──────────────────────────────────────────────────────────────────
  { re: rx(`մշուշարձակ${A}*`), ru: 'противотуманная фара', en: 'fog light' },
  { re: rx(`լուսարձակ${A}*`), ru: 'фара', en: 'headlight' },
  { re: rx(`լամպիկ${A}*`), ru: 'лампа', en: 'bulb' },
  { re: rx(`լամպ${A}*`), ru: 'лампа', en: 'bulb' },

  // ── Other common parts (from the catalog glossary) ──────────────────────────
  { re: rx(`ֆիլտր${A}*`), ru: 'фильтр', en: 'filter' },
  { re: rx(`անվադող${A}*`), ru: 'шина', en: 'tire' },
  { re: rx(`սկավառակ${A}*`), ru: 'диск', en: 'disc' },
  { re: rx(`արգելակման\\s+կոճղակ${A}*`), ru: 'тормозная колодка', en: 'brake pad' },
  { re: rx(`կոճղակ${A}*`), ru: 'тормозная колодка', en: 'brake pad' },
  { re: rx(`արգելակ${A}*`), ru: 'тормоз', en: 'brake' },
  { re: rx(`մարտկոց${A}*`), ru: 'аккумулятор', en: 'battery' },
  { re: rx(`բատարան${A}*`), ru: 'аккумулятор', en: 'battery' },
  { re: rx(`վառման\\s+մոմ${A}*`), ru: 'свеча зажигания', en: 'spark plug' },
  { re: rx(`մոմ${A}*`), ru: 'свеча зажигания', en: 'spark plug' },
  { re: rx(`ամորտիզատոր${A}*`), ru: 'амортизатор', en: 'shock absorber' },
  { re: rx(`ռադիատոր${A}*`), ru: 'радиатор', en: 'radiator' },
  { re: rx(`պոմպ${A}*`), ru: 'насос', en: 'pump' },
  { re: rx(`սենսոր${A}*`), ru: 'датчик', en: 'sensor' },
  { re: rx(`տվիչ${A}*`), ru: 'датчик', en: 'sensor' },
  { re: rx(`գոտի${A}*`), ru: 'ремень', en: 'belt' },
  { re: rx(`բուրավետիչ${A}*`), ru: 'ароматизатор', en: 'air freshener' },
  { re: rx(`ռելե${A}*`), ru: 'реле', en: 'relay' },

  // ── Modifiers ───────────────────────────────────────────────────────────────
  { re: rx(`հիբրիդ${A}*`), ru: 'гибридная', en: 'hybrid' },

  // ── Positions (feminine forms — the dominant catalog nouns фара/щётка/шина/
  //    лампа/колодка are all feminine) ─────────────────────────────────────────
  { re: rx(`առջևի${A}*`), ru: 'передняя', en: 'front' },
  { re: rx(`հետևի${A}*`), ru: 'задняя', en: 'rear' },
  { re: rx(`ձախ${A}*`), ru: 'левая', en: 'left' },
  { re: rx(`աջ${A}*`), ru: 'правая', en: 'right' },

  // ── Units (Armenian -> RU / EN). Numbers and the inch sign stay as-is. ───────
  { re: rx(`մմ`), ru: 'мм', en: 'mm' },
  { re: rx(`սմ`), ru: 'см', en: 'cm' },
];

/** True if the string still contains any Armenian letters. */
const hasArmenian = (s: string): boolean => /[\u0531-\u0556\u0561-\u0587]/u.test(s);

/** Collapse doubled spaces and trim; capitalize the first visible letter. */
function tidy(s: string): string {
  const cleaned = s.replace(/\s{2,}/g, ' ').replace(/\s+([)\].,])/g, '$1').trim();
  if (!cleaned) return cleaned;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

/**
 * Translate a formulaic Armenian name into Russian and English.
 *
 * @returns `{ ru, en, complete }` where `complete` is true only when no Armenian
 * letters remain in BOTH outputs — i.e. the dictionary fully handled the name
 * and the caller can safely skip the LLM.
 */
export function dictTranslateName(name: string): DictResult {
  const src = (name ?? '').trim();
  if (!src) return { ru: '', en: '', complete: true };

  let ru = src;
  let en = src;
  for (const e of ENTRIES) {
    // Reset lastIndex defensively (global regexes are stateful).
    e.re.lastIndex = 0;
    ru = ru.replace(e.re, e.ru);
    e.re.lastIndex = 0;
    en = en.replace(e.re, e.en);
  }

  ru = tidy(ru);
  en = tidy(en);
  const complete = !hasArmenian(ru) && !hasArmenian(en);
  return { ru, en, complete };
}
