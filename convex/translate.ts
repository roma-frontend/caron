import { v } from 'convex/values';
import { internalAction, internalMutation, internalQuery, mutation } from './_generated/server';
import { internal } from './_generated/api';
import { getAdminCaller } from './lib/auth';
import { dictTranslateName } from './lib/translateDict';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

type Tr = { nameRu: string; nameEn: string; descriptionRu: string; descriptionEn: string };

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

  const nameRu = dictCoversName ? dict.ru : (groq?.nameRu ?? '');
  const nameEn = dictCoversName ? dict.en : (groq?.nameEn ?? '');
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
      (force ? (fresh || existing) : (existing?.trim() || fresh)) || undefined;

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
      (force ? (fresh || existing) : (existing?.trim() || fresh)) || undefined;

    await ctx.runMutation(internal.translate.patchCategoryTranslations, {
      id,
      nameRu: keep(c.nameRu, tr.nameRu),
      nameEn: keep(c.nameEn, tr.nameEn),
      descriptionRu: keep(c.descriptionRu, tr.descriptionRu),
      descriptionEn: keep(c.descriptionEn, tr.descriptionEn),
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
    await getAdminCaller(ctx, sessionToken);

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

    return { scheduled, etaMinutes: Math.ceil((scheduled * SPACING_MS) / 60000) };
  },
});
