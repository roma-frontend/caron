import { v } from 'convex/values';
import { internalAction, internalMutation, internalQuery, mutation } from './_generated/server';
import { internal } from './_generated/api';
import { requireCapability } from './lib/auth';
import { dictTranslateName } from './lib/translateDict';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

type Tr = { nameRu: string; nameEn: string; descriptionRu: string; descriptionEn: string };

/** True if the string still contains any Armenian letters. */
const hasArmenian = (s: string | undefined): boolean =>
  /[\u0531-\u0556\u0561-\u0587]/u.test(s ?? '');

/**
 * Choose the best name for an LLM-handled (dictionary-incomplete) field.
 * Prefer the LLM answer only when it is "clean" (no Armenian letters left);
 * otherwise fall back to the dictionary's partial translation rather than
 * storing half-Armenian LLM garbage.
 */
function pickName(llm: string, dictPartial: string): string {
  if (llm && !hasArmenian(llm)) return llm;
  return dictPartial || llm;
}

/**
 * Decide the value to persist for one field, honoring `force`.
 * Critically: when forcing, never replace a clean existing translation with a
 * fresh value that still contains Armenian (e.g. an LLM rate-limit failure).
 */
function pickPersist(
  existing: string | undefined,
  fresh: string,
  force: boolean,
): string | undefined {
  const e = (existing ?? '').trim();
  const f = (fresh ?? '').trim();
  if (!force) return (e || f) || undefined;
  if (f && !hasArmenian(f)) return f; // clean fresh wins
  if (e && !hasArmenian(e)) return e; // keep clean existing over dirty fresh
  return (f || e) || undefined;
}

/**
 * Translate Armenian name/description to Russian + English via Groq.
 * Returns empty strings on any failure so callers can skip gracefully.
 * Requires GROQ_API_KEY to be set in the Convex environment
 * (`npx convex env set GROQ_API_KEY <key>`).
 */
async function groqTranslate(name: string, description: string): Promise<Tr | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    console.warn('[translate] GROQ_API_KEY not set in Convex env');
    return null;
  }
  const system = [
    'You are a professional translator for an auto-parts online store in Armenia.',
    'The source language is Armenian. You produce natural Russian and English.',
    '',
    'METHOD (very important for quality):',
    '- First translate the Armenian into correct ENGLISH (the meaning).',
    '- Then translate that ENGLISH into natural RUSSIAN.',
    '- The Russian MUST correspond to the English meaning, NOT to the Armenian letters.',
    '',
    'CRITICAL RULES:',
    '- NEVER transliterate Armenian words into Cyrillic or Latin letters. Translate the MEANING.',
    '  WRONG (transliteration): "Хозанак", "Димапаку", "Фарский хозанак", "Лусарцак".',
    '  RIGHT (translation): "щётка стеклоочистителя", "фара".',
    '- Russian must read like a native Russian auto-parts catalog. No Armenian words in Cyrillic.',
    '- Keep brand names, model codes, article numbers and Latin words unchanged (e.g. "Dep Sun", "5W-30", "H7", "R16", "DDH").',
    '- Convert units: "մմ"->"мм"/"mm", "սմ"->"см"/"cm". Keep numbers and the inch sign (") as-is.',
    '- Do not invent facts. If a field is empty, return an empty string for it.',
    '',
    'GLOSSARY (Armenian -> Russian / English):',
    '- Դիմապակու խոզանակ / Ապակու խոզանակ / ապակեմաքրիչ = щётка стеклоочистителя / wiper blade',
    '- խոզանակ = щётка / brush',
    '- հիբրիդ = гибридная / hybrid',
    '- Դիմապակի = лобовое стекло / windshield',
    '- Ապակի = стекло / glass',
    '- Լուսարձակ = фара / headlight',
    '- Մշուշարձակ = противотуманная фара / fog light',
    '- Լույս / լուսային = свет / light',
    '- Լամպ / Լամպեր / լամպիկ = лампа / bulb',
    '- Ֆիլտր = фильтр / filter',
    '- Յուղ = масло / oil',
    '- Անվադող / Անիվ = шина / tire',
    '- Սկավառակ = диск / disc',
    '- Կոճղակ / արգելակման կոճղակ = тормозная колодка / brake pad',
    '- Արգելակ = тормоз / brake',
    '- Մարտկոց / Բատարան = аккумулятор / battery',
    '- Մոմ / վառման մոմ = свеча зажигания / spark plug',
    '- Գոտի = ремень / belt',
    '- Պոմպ / պոմպա = насос / pump',
    '- Տվիչ / սենսոր = датчик / sensor',
    '- Ռադիատոր = радиатор / radiator',
    '- Ամորտիզատոր = амортизатор / shock absorber',
    '- Ավտոքիմիա = автохимия / auto chemicals',
    '- Բուրավետիչ = ароматизатор / air freshener',
    '- Ռելե = реле / relay',
    '- Տյունինգ = тюнинг / tuning',
    '- առջևի = передний / front; հետևի = задний / rear; ձախ = левый / left; աջ = правый / right',
    '',
    'EXAMPLES:',
    'Input name (hy): Դիմապակու խոզանակ հիբրիդ Dep Sun 22" (550 մմ)',
    'Output: {"nameRu":"Щётка стеклоочистителя гибридная Dep Sun 22\\" (550 мм)","nameEn":"Hybrid wiper blade Dep Sun 22\\" (550 mm)","descriptionRu":"","descriptionEn":""}',
    'Input name (hy): Առջևի լուսարձակ ձախ',
    'Output: {"nameRu":"Передняя фара левая","nameEn":"Front left headlight","descriptionRu":"","descriptionEn":""}',
    '',
    'Respond with ONLY valid JSON, no markdown, in this exact shape:',
    '{"nameRu":"","nameEn":"","descriptionRu":"","descriptionEn":""}',
  ].join('\n');

  const userMsg = [
    `name (hy): ${name || '(empty)'}`,
    `description (hy): ${description || '(empty)'}`,
  ].join('\n');

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          temperature: 0.1,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: userMsg },
          ],
        }),
      });

      // Transient errors (rate limit / server) → wait and retry.
      if (res.status === 429 || res.status >= 500) {
        const retryAfter = Number(res.headers.get('retry-after'));
        const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : attempt * 5000;
        if (attempt < 3) { await sleep(waitMs); continue; }
        console.error('[translate] Groq error', res.status, await res.text());
        return null;
      }
      if (!res.ok) {
        console.error('[translate] Groq error', res.status, await res.text());
        return null;
      }

      const data = await res.json();
      const text: string = data?.choices?.[0]?.message?.content ?? '';
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) { if (attempt < 3) { await sleep(1500); continue; } return null; }
      const parsed = JSON.parse(match[0]) as Partial<Tr>;
      const result: Tr = {
        nameRu: String(parsed.nameRu ?? '').trim(),
        nameEn: String(parsed.nameEn ?? '').trim(),
        descriptionRu: String(parsed.descriptionRu ?? '').trim(),
        descriptionEn: String(parsed.descriptionEn ?? '').trim(),
      };
      // If we had a source name but got no Russian back, retry instead of leaving it untranslated.
      if (name.trim() && !result.nameRu && attempt < 3) { await sleep(1500); continue; }
      return result;
    } catch (e) {
      if (attempt < 3) { await sleep(1500); continue; }
      console.error('[translate] failed', e instanceof Error ? e.message : e);
      return null;
    }
  }
  return null;
}

// ── Combined translator: dictionary first, LLM only as fallback ──────────────

/**
 * Translate name + description to RU/EN.
 *
 * The product/category NAMES in this catalog are formulaic, so we translate
 * them with the deterministic {@link dictTranslateName} dictionary first. When
 * the dictionary fully covers the name (`complete`), we use it verbatim and
 * never touch the (unreliable, rate-limited) LLM for the name — this is what
 * fixes the "Фары / Фарский Хозанак / Димапаку" garbage and makes the bulk of
 * the catalog translate instantly and identically every run.
 *
 * The LLM is still used for: (a) names the dictionary can't fully resolve, and
 * (b) free-text descriptions, which a dictionary can't handle.
 */
async function translateFields(name: string, description: string): Promise<Tr | null> {
  const trimmedName = name.trim();
  const dict = dictTranslateName(trimmedName);
  const dictCoversName = Boolean(trimmedName) && dict.complete;

  const needGroqForName = Boolean(trimmedName) && !dict.complete;
  const needGroqForDesc = Boolean(description.trim());
  const groq = needGroqForName || needGroqForDesc ? await groqTranslate(name, description) : null;

  // For names the dictionary fully covers, ALWAYS use the dictionary (instant,
  // deterministic, identical every run). Otherwise take the LLM result, but
  // reject an LLM name that still contains Armenian (a failed/garbage answer)
  // and fall back to the dictionary's partial translation — which at least
  // converts every known word — so we never store half-translated garbage.
  const llmNameRu = (groq?.nameRu ?? '').trim();
  const llmNameEn = (groq?.nameEn ?? '').trim();
  const nameRu = dictCoversName ? dict.ru : pickName(llmNameRu, dict.ru);
  const nameEn = dictCoversName ? dict.en : pickName(llmNameEn, dict.en);
  const descriptionRu = groq?.descriptionRu ?? '';
  const descriptionEn = groq?.descriptionEn ?? '';

  if (!nameRu && !nameEn && !descriptionRu && !descriptionEn) return null;
  return { nameRu, nameEn, descriptionRu, descriptionEn };
}

// ── Products ────────────────────────────────────────────────────────────────

export const getProductForTranslate = internalQuery({
  args: { id: v.id('products') },
  handler: async (ctx, { id }) => {
    const p = await ctx.db.get(id);
    if (!p) return null;
    return {
      name: p.name, description: p.description,
      nameRu: p.nameRu, nameEn: p.nameEn,
      descriptionRu: p.descriptionRu, descriptionEn: p.descriptionEn,
    };
  },
});

export const patchProductTranslations = internalMutation({
  args: {
    id: v.id('products'),
    nameRu: v.optional(v.string()), nameEn: v.optional(v.string()),
    descriptionRu: v.optional(v.string()), descriptionEn: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...patch }) => {
    await ctx.db.patch(id, patch);
  },
});

export const translateProduct = internalAction({
  args: { id: v.id('products'), force: v.optional(v.boolean()) },
  handler: async (ctx, { id, force }) => {
    const p = await ctx.runQuery(internal.translate.getProductForTranslate, { id });
    if (!p) return;
    const needName = force ? Boolean(p.name?.trim()) : (!p.nameRu?.trim() || !p.nameEn?.trim());
    const needDesc = Boolean(p.description?.trim()) && (force || !p.descriptionRu?.trim() || !p.descriptionEn?.trim());
    if (!needName && !needDesc) return;

    const tr = await translateFields(p.name ?? '', p.description ?? '');
    if (!tr) return;

    const keep = (existing: string | undefined, fresh: string) =>
      pickPersist(existing, fresh, Boolean(force));

    await ctx.runMutation(internal.translate.patchProductTranslations, {
      id,
      nameRu: keep(p.nameRu, tr.nameRu),
      nameEn: keep(p.nameEn, tr.nameEn),
      descriptionRu: keep(p.descriptionRu, tr.descriptionRu),
      descriptionEn: keep(p.descriptionEn, tr.descriptionEn),
    });
  },
});

// ── Categories ────────────────────────────────────────────────────────────────

export const getCategoryForTranslate = internalQuery({
  args: { id: v.id('categories') },
  handler: async (ctx, { id }) => {
    const c = await ctx.db.get(id);
    if (!c) return null;
    return {
      name: c.name, description: c.description,
      nameRu: c.nameRu, nameEn: c.nameEn,
      descriptionRu: c.descriptionRu, descriptionEn: c.descriptionEn,
    };
  },
});

export const patchCategoryTranslations = internalMutation({
  args: {
    id: v.id('categories'),
    nameRu: v.optional(v.string()), nameEn: v.optional(v.string()),
    descriptionRu: v.optional(v.string()), descriptionEn: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...patch }) => {
    await ctx.db.patch(id, patch);
  },
});

export const translateCategory = internalAction({
  args: { id: v.id('categories'), force: v.optional(v.boolean()) },
  handler: async (ctx, { id, force }) => {
    const c = await ctx.runQuery(internal.translate.getCategoryForTranslate, { id });
    if (!c) return;
    const needName = force ? Boolean(c.name?.trim()) : (!c.nameRu?.trim() || !c.nameEn?.trim());
    const needDesc = Boolean(c.description?.trim()) && (force || !c.descriptionRu?.trim() || !c.descriptionEn?.trim());
    if (!needName && !needDesc) return;

    const tr = await translateFields(c.name ?? '', c.description ?? '');
    if (!tr) return;

    const keep = (existing: string | undefined, fresh: string) =>
      pickPersist(existing, fresh, Boolean(force));

    await ctx.runMutation(internal.translate.patchCategoryTranslations, {
      id,
      nameRu: keep(c.nameRu, tr.nameRu),
      nameEn: keep(c.nameEn, tr.nameEn),
      descriptionRu: keep(c.descriptionRu, tr.descriptionRu),
      descriptionEn: keep(c.descriptionEn, tr.descriptionEn),
    });
  },
});

// ── Promotions ────────────────────────────────────────────────────────────────

/**
 * Translate an arbitrary set of labeled Armenian strings to RU + EN in a single
 * Groq call. Used for promotions, whose text (title/description + the in-card
 * template title/subtitle/footnote) is free-form marketing copy a dictionary
 * cannot handle. Returns null on failure so callers fall back gracefully.
 */
async function groqTranslateBatch(
  items: { key: string; text: string }[],
): Promise<Record<string, { ru: string; en: string }> | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key || items.length === 0) return null;
  const system = [
    'You are a professional translator for an auto-parts online store in Armenia.',
    'Translate each Armenian value into natural Russian and English.',
    'RULES:',
    '- Translate the MEANING. NEVER transliterate Armenian into Cyrillic or Latin letters.',
    '- Keep brand names, model codes, numbers, percentages and units unchanged (e.g. "Hito", "Dep Sun", "-30%", "2+1", "5W-30").',
    '- If a value contains HTML tags, keep every tag and attribute exactly as-is and translate ONLY the human-readable text between tags.',
    '- Keep the marketing tone and roughly the same length as the source.',
    '- If a value is empty, return empty strings for it.',
    'Respond with ONLY valid JSON: an object mapping each given key to an object {"ru":"","en":""}.',
  ].join('\n');
  const userMsg = `Translate these fields (hy) to ru/en: ${JSON.stringify(
    Object.fromEntries(items.map((i) => [i.key, i.text])),
  )}`;

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          temperature: 0.1,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: userMsg },
          ],
        }),
      });
      if (res.status === 429 || res.status >= 500) {
        if (attempt < 3) { await sleep(attempt * 5000); continue; }
        return null;
      }
      if (!res.ok) return null;
      const data = await res.json();
      const text: string = data?.choices?.[0]?.message?.content ?? '';
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) { if (attempt < 3) { await sleep(1500); continue; } return null; }
      const parsed = JSON.parse(match[0]) as Record<string, { ru?: string; en?: string }>;
      const out: Record<string, { ru: string; en: string }> = {};
      for (const it of items) {
        const v = parsed[it.key] ?? {};
        out[it.key] = { ru: String(v.ru ?? '').trim(), en: String(v.en ?? '').trim() };
      }
      return out;
    } catch {
      if (attempt < 3) { await sleep(1500); continue; }
      return null;
    }
  }
  return null;
}

export const getPromotionForTranslate = internalQuery({
  args: { id: v.id('promotions') },
  handler: async (ctx, { id }) => {
    const p = await ctx.db.get(id);
    if (!p) return null;
    return {
      title: p.title, description: p.description, templateJson: p.templateJson,
      titleRu: p.titleRu, titleEn: p.titleEn,
      descriptionRu: p.descriptionRu, descriptionEn: p.descriptionEn,
      templateJsonRu: p.templateJsonRu, templateJsonEn: p.templateJsonEn,
    };
  },
});

export const patchPromotionTranslations = internalMutation({
  args: {
    id: v.id('promotions'),
    titleRu: v.optional(v.string()), titleEn: v.optional(v.string()),
    descriptionRu: v.optional(v.string()), descriptionEn: v.optional(v.string()),
    templateJsonRu: v.optional(v.string()), templateJsonEn: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...patch }) => {
    await ctx.db.patch(id, patch);
  },
});

/** Localized text fields of the promo template config (free marketing copy). */
const PROMO_TPL_TEXT_KEYS = ['title', 'subtitle', 'footnote'] as const;

export const translatePromotion = internalAction({
  args: { id: v.id('promotions'), force: v.optional(v.boolean()) },
  handler: async (ctx, { id, force }) => {
    const p = await ctx.runQuery(internal.translate.getPromotionForTranslate, { id });
    if (!p) return;

    const needTitle = force ? Boolean(p.title?.trim()) : (!p.titleRu?.trim() || !p.titleEn?.trim());
    const needDesc = Boolean(p.description?.trim()) && (force || !p.descriptionRu?.trim() || !p.descriptionEn?.trim());
    const needTpl = Boolean(p.templateJson?.trim()) && (force || !p.templateJsonRu?.trim() || !p.templateJsonEn?.trim());
    if (!needTitle && !needDesc && !needTpl) return;

    // Parse the base template config (plain JSON; the visual settings are kept
    // verbatim, only the text fields get translated).
    let baseCfg: Record<string, unknown> | null = null;
    if (p.templateJson?.trim()) {
      try { baseCfg = JSON.parse(p.templateJson) as Record<string, unknown>; } catch { baseCfg = null; }
    }

    // Collect every source text → dictionary first, LLM for the rest in one batch.
    const dictByKey: Record<string, { ru: string; en: string; complete: boolean }> = {};
    const llmItems: { key: string; text: string }[] = [];
    const addField = (key: string, text: string | undefined) => {
      const t = (text ?? '').trim();
      if (!t) { dictByKey[key] = { ru: '', en: '', complete: true }; return; }
      const d = dictTranslateName(t);
      dictByKey[key] = { ru: d.ru, en: d.en, complete: d.complete };
      if (!d.complete) llmItems.push({ key, text: t });
    };

    addField('title', p.title);
    addField('description', p.description);
    if (baseCfg) {
      for (const k of PROMO_TPL_TEXT_KEYS) addField(`tpl_${k}`, baseCfg[k] as string | undefined);
    }

    const batch = llmItems.length ? await groqTranslateBatch(llmItems) : null;
    const pick = (key: string): { ru: string; en: string } => {
      const d = dictByKey[key];
      if (!d) return { ru: '', en: '' };
      if (d.complete) return { ru: d.ru, en: d.en };
      const b = batch?.[key];
      return { ru: pickName(b?.ru ?? '', d.ru), en: pickName(b?.en ?? '', d.en) };
    };

    const title = pick('title');
    const desc = pick('description');

    // Rebuild localized template configs, keeping visual settings + headline.
    let templateJsonRu: string | undefined;
    let templateJsonEn: string | undefined;
    if (baseCfg) {
      const ruCfg: Record<string, unknown> = { ...baseCfg };
      const enCfg: Record<string, unknown> = { ...baseCfg };
      for (const k of PROMO_TPL_TEXT_KEYS) {
        const tr = pick(`tpl_${k}`);
        ruCfg[k] = tr.ru;
        enCfg[k] = tr.en;
      }
      templateJsonRu = JSON.stringify(ruCfg);
      templateJsonEn = JSON.stringify(enCfg);
    }

    const keep = (existing: string | undefined, fresh: string | undefined) =>
      pickPersist(existing, fresh ?? '', Boolean(force));

    await ctx.runMutation(internal.translate.patchPromotionTranslations, {
      id,
      titleRu: keep(p.titleRu, title.ru),
      titleEn: keep(p.titleEn, title.en),
      descriptionRu: keep(p.descriptionRu, desc.ru),
      descriptionEn: keep(p.descriptionEn, desc.en),
      templateJsonRu: keep(p.templateJsonRu, templateJsonRu),
      templateJsonEn: keep(p.templateJsonEn, templateJsonEn),
    });
  },
});

// ── Filters (filterDefinitions) ─────────────────────────────────────────────

export const getFilterForTranslate = internalQuery({
  args: { id: v.id('filterDefinitions') },
  handler: async (ctx, { id }) => {
    const f = await ctx.db.get(id);
    if (!f) return null;
    return {
      name: f.name, options: f.options ?? [],
      nameRu: f.nameRu, nameEn: f.nameEn,
      optionsRu: f.optionsRu, optionsEn: f.optionsEn,
    };
  },
});

export const patchFilterTranslations = internalMutation({
  args: {
    id: v.id('filterDefinitions'),
    nameRu: v.optional(v.string()), nameEn: v.optional(v.string()),
    optionsRu: v.optional(v.array(v.string())), optionsEn: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { id, ...patch }) => {
    await ctx.db.patch(id, patch);
  },
});

/**
 * Translate a filter definition: its `name` plus every entry in `options`.
 * `optionsRu`/`optionsEn` are kept parallel to `options` (same order/length),
 * so the storefront can show a localized label while filtering still uses the
 * canonical Armenian option value. Dictionary first, Groq for the remainder.
 */
export const translateFilter = internalAction({
  args: { id: v.id('filterDefinitions'), force: v.optional(v.boolean()) },
  handler: async (ctx, { id, force }) => {
    const f = await ctx.runQuery(internal.translate.getFilterForTranslate, { id });
    if (!f) return;

    const needName = force ? Boolean(f.name?.trim()) : (!f.nameRu?.trim() || !f.nameEn?.trim());
    const optionCount = f.options.length;
    const needOpts = optionCount > 0 && (force
      || (f.optionsRu?.length ?? 0) !== optionCount
      || (f.optionsEn?.length ?? 0) !== optionCount);
    if (!needName && !needOpts) return;

    // Dictionary first, collect leftovers for one Groq batch call.
    const dictByKey: Record<string, { ru: string; en: string; complete: boolean }> = {};
    const llmItems: { key: string; text: string }[] = [];
    const addField = (key: string, text: string | undefined) => {
      const t = (text ?? '').trim();
      if (!t) { dictByKey[key] = { ru: '', en: '', complete: true }; return; }
      const d = dictTranslateName(t);
      dictByKey[key] = { ru: d.ru, en: d.en, complete: d.complete };
      if (!d.complete) llmItems.push({ key, text: t });
    };

    addField('name', f.name);
    f.options.forEach((opt, i) => addField(`opt_${i}`, opt));

    const batch = llmItems.length ? await groqTranslateBatch(llmItems) : null;
    const pick = (key: string): { ru: string; en: string } => {
      const d = dictByKey[key];
      if (!d) return { ru: '', en: '' };
      if (d.complete) return { ru: d.ru, en: d.en };
      const b = batch?.[key];
      return { ru: pickName(b?.ru ?? '', d.ru), en: pickName(b?.en ?? '', d.en) };
    };

    const name = pick('name');
    const optionsRu = f.options.map((_, i) => pick(`opt_${i}`).ru);
    const optionsEn = f.options.map((_, i) => pick(`opt_${i}`).en);

    const keep = (existing: string | undefined, fresh: string) =>
      pickPersist(existing, fresh, Boolean(force));

    await ctx.runMutation(internal.translate.patchFilterTranslations, {
      id,
      nameRu: keep(f.nameRu, name.ru),
      nameEn: keep(f.nameEn, name.en),
      // Options are stored as a whole array; only persist when we have a
      // complete, same-length translation to keep them aligned with `options`.
      optionsRu: optionCount > 0 ? optionsRu : undefined,
      optionsEn: optionCount > 0 ? optionsEn : undefined,
    });
  },
});

// ── CMS Pages ───────────────────────────────────────────────────────────────

export const getPageForTranslate = internalQuery({
  args: { id: v.id('pages') },
  handler: async (ctx, { id }) => {
    const p = await ctx.db.get(id);
    if (!p) return null;
    return {
      title: p.title, content: p.content,
      seoTitle: p.seoTitle, seoDescription: p.seoDescription,
      titleRu: p.titleRu, titleEn: p.titleEn,
      contentRu: p.contentRu, contentEn: p.contentEn,
      seoTitleRu: p.seoTitleRu, seoTitleEn: p.seoTitleEn,
      seoDescriptionRu: p.seoDescriptionRu, seoDescriptionEn: p.seoDescriptionEn,
    };
  },
});

export const patchPageTranslations = internalMutation({
  args: {
    id: v.id('pages'),
    titleRu: v.optional(v.string()), titleEn: v.optional(v.string()),
    contentRu: v.optional(v.string()), contentEn: v.optional(v.string()),
    seoTitleRu: v.optional(v.string()), seoTitleEn: v.optional(v.string()),
    seoDescriptionRu: v.optional(v.string()), seoDescriptionEn: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...patch }) => {
    await ctx.db.patch(id, patch);
  },
});

/**
 * Translate a CMS page (title + HTML content + SEO fields) to RU/EN. Free-form
 * marketing/legal copy, so it goes straight to the LLM (no dictionary). HTML
 * tags are preserved per the batch translator's rules.
 */
export const translatePage = internalAction({
  args: { id: v.id('pages'), force: v.optional(v.boolean()) },
  handler: async (ctx, { id, force }) => {
    const p = await ctx.runQuery(internal.translate.getPageForTranslate, { id });
    if (!p) return;

    const missing = (ru?: string, en?: string) => !ru?.trim() || !en?.trim();
    const needTitle = Boolean(p.title?.trim()) && (force || missing(p.titleRu, p.titleEn));
    const needContent = Boolean(p.content?.trim()) && (force || missing(p.contentRu, p.contentEn));
    const needSeoTitle = Boolean(p.seoTitle?.trim()) && (force || missing(p.seoTitleRu, p.seoTitleEn));
    const needSeoDesc = Boolean(p.seoDescription?.trim()) && (force || missing(p.seoDescriptionRu, p.seoDescriptionEn));
    if (!needTitle && !needContent && !needSeoTitle && !needSeoDesc) return;

    const items: { key: string; text: string }[] = [];
    if (p.title?.trim()) items.push({ key: 'title', text: p.title });
    if (p.content?.trim()) items.push({ key: 'content', text: p.content });
    if (p.seoTitle?.trim()) items.push({ key: 'seoTitle', text: p.seoTitle });
    if (p.seoDescription?.trim()) items.push({ key: 'seoDescription', text: p.seoDescription });

    const batch = await groqTranslateBatch(items);
    if (!batch) return;
    const pick = (key: string) => ({ ru: batch[key]?.ru ?? '', en: batch[key]?.en ?? '' });

    const title = pick('title');
    const content = pick('content');
    const seoTitle = pick('seoTitle');
    const seoDesc = pick('seoDescription');

    const keep = (existing: string | undefined, fresh: string) =>
      pickPersist(existing, fresh, Boolean(force));

    await ctx.runMutation(internal.translate.patchPageTranslations, {
      id,
      titleRu: keep(p.titleRu, title.ru),
      titleEn: keep(p.titleEn, title.en),
      contentRu: keep(p.contentRu, content.ru),
      contentEn: keep(p.contentEn, content.en),
      seoTitleRu: keep(p.seoTitleRu, seoTitle.ru),
      seoTitleEn: keep(p.seoTitleEn, seoTitle.en),
      seoDescriptionRu: keep(p.seoDescriptionRu, seoDesc.ru),
      seoDescriptionEn: keep(p.seoDescriptionEn, seoDesc.en),
    });
  },
});

// ── Backfill (admin) ──────────────────────────────────────────────────────────

/**
 * Schedule AI translation for every product & category that is missing a
 * RU/EN translation. Calls are staggered (~2.5s apart) to respect the Groq
 * rate limit; they run in the background via the Convex scheduler.
 */
export const backfillAll = mutation({
  args: { sessionToken: v.string(), force: v.optional(v.boolean()) },
  handler: async (ctx, { sessionToken, force }) => {
    await requireCapability(ctx, sessionToken, 'settings');

    const SPACING_MS = 3500;
    let scheduled = 0;

    const categories = await ctx.db.query('categories').take(500);
    for (const c of categories) {
      const needName = force ? Boolean(c.name?.trim()) : (!c.nameRu?.trim() || !c.nameEn?.trim());
      const needDesc = Boolean(c.description?.trim()) && (force || !c.descriptionRu?.trim() || !c.descriptionEn?.trim());
      if (!needName && !needDesc) continue;
      await ctx.scheduler.runAfter(scheduled * SPACING_MS, internal.translate.translateCategory, { id: c._id, force });
      scheduled++;
    }

    const products = await ctx.db.query('products').take(5000);
    for (const p of products) {
      const needName = force ? Boolean(p.name?.trim()) : (!p.nameRu?.trim() || !p.nameEn?.trim());
      const needDesc = Boolean(p.description?.trim()) && (force || !p.descriptionRu?.trim() || !p.descriptionEn?.trim());
      if (!needName && !needDesc) continue;
      await ctx.scheduler.runAfter(scheduled * SPACING_MS, internal.translate.translateProduct, { id: p._id, force });
      scheduled++;
    }

    const promotions = await ctx.db.query('promotions').take(200);
    for (const p of promotions) {
      const needTitle = force ? Boolean(p.title?.trim()) : (!p.titleRu?.trim() || !p.titleEn?.trim());
      const needDesc = Boolean(p.description?.trim()) && (force || !p.descriptionRu?.trim() || !p.descriptionEn?.trim());
      const needTpl = Boolean(p.templateJson?.trim()) && (force || !p.templateJsonRu?.trim() || !p.templateJsonEn?.trim());
      if (!needTitle && !needDesc && !needTpl) continue;
      await ctx.scheduler.runAfter(scheduled * SPACING_MS, internal.translate.translatePromotion, { id: p._id, force });
      scheduled++;
    }

    const filters = await ctx.db.query('filterDefinitions').take(1000);
    for (const f of filters) {
      const optCount = f.options?.length ?? 0;
      const needName = force ? Boolean(f.name?.trim()) : (!f.nameRu?.trim() || !f.nameEn?.trim());
      const needOpts = optCount > 0 && (force
        || (f.optionsRu?.length ?? 0) !== optCount
        || (f.optionsEn?.length ?? 0) !== optCount);
      if (!needName && !needOpts) continue;
      await ctx.scheduler.runAfter(scheduled * SPACING_MS, internal.translate.translateFilter, { id: f._id, force });
      scheduled++;
    }

    const pages = await ctx.db.query('pages').take(200);
    for (const p of pages) {
      const miss = (ru?: string, en?: string) => !ru?.trim() || !en?.trim();
      const needTitle = Boolean(p.title?.trim()) && (force || miss(p.titleRu, p.titleEn));
      const needContent = Boolean(p.content?.trim()) && (force || miss(p.contentRu, p.contentEn));
      const needSeo = (Boolean(p.seoTitle?.trim()) && (force || miss(p.seoTitleRu, p.seoTitleEn)))
        || (Boolean(p.seoDescription?.trim()) && (force || miss(p.seoDescriptionRu, p.seoDescriptionEn)));
      if (!needTitle && !needContent && !needSeo) continue;
      await ctx.scheduler.runAfter(scheduled * SPACING_MS, internal.translate.translatePage, { id: p._id, force });
      scheduled++;
    }

    return { scheduled, etaMinutes: Math.ceil((scheduled * SPACING_MS) / 60000) };
  },
});
