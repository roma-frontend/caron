import { dictTranslateName } from '../convex/lib/translateDict';

type Case = { in: string; ru: string; en?: string; complete?: boolean };

// Inputs are the Armenian source names; expected RU is what the catalog SHOULD
// show instead of the broken "Фары / Фарский Хозанак / Димапаку" output.
const cases: Case[] = [
  {
    in: 'Դիմապակու խոզանակ HITO X5 13" (330 մմ)',
    ru: 'Щётка стеклоочистителя HITO X5 13" (330 мм)',
    en: 'Wiper blade HITO X5 13" (330 mm)',
    complete: true,
  },
  {
    in: 'Դիմապակու խոզանակ Dep Sun 14" (350 մմ)',
    ru: 'Щётка стеклоочистителя Dep Sun 14" (350 мм)',
    complete: true,
  },
  {
    in: 'Դիմապակու խոզանակ հիբրիդ Dep Sun 22" (550 մմ)',
    ru: 'Щётка стеклоочистителя гибридная Dep Sun 22" (550 мм)',
    en: 'Hybrid wiper blade Dep Sun 22" (550 mm)',
    complete: true,
  },
  {
    in: 'Դիմապակու խոզանակ Dep Sun Mercedes-Benz 28" (700 մմ)',
    ru: 'Щётка стеклоочистителя Dep Sun Mercedes-Benz 28" (700 мм)',
    complete: true,
  },
  {
    in: 'Ապակու Խոզանակներ',
    ru: 'Щётки стеклоочистителя',
    en: 'Wiper blades',
    complete: true,
  },
  {
    in: 'Դիմապակու խոզանակ հիբրիդ Dep Sun 28" (700 մմ)',
    ru: 'Щётка стеклоочистителя гибридная Dep Sun 28" (700 мм)',
    complete: true,
  },
  // The glossary example that I previously CLAIMED to verify but never did.
  {
    in: 'Առջևի լուսարձակ ձախ',
    ru: 'Передняя фара левая',
    en: 'Front headlight left',
    complete: true,
  },
  { in: 'Մշուշարձակ', ru: 'Противотуманная фара', complete: true },
  { in: 'Դիմապակ', ru: 'Лобовое стекло', en: 'Windshield', complete: true },
  // A name the dictionary does NOT cover -> must be flagged incomplete so the
  // caller falls back to the LLM rather than storing half-Armenian text.
  { in: 'Ինչ-որ անհայտ բառ XYZ', ru: '', complete: false },
];

let passed = 0;
let failed = 0;
for (const c of cases) {
  const r = dictTranslateName(c.in);
  const ruOk = r.ru === c.ru;
  const enOk = c.en === undefined || r.en === c.en;
  const compOk = c.complete === undefined || r.complete === c.complete;
  // For the "incomplete" case we only assert the flag, not exact text.
  const ok = c.complete === false ? compOk : ruOk && enOk && compOk;
  if (ok) {
    passed++;
    console.log(`PASS  ${c.in}`);
  } else {
    failed++;
    console.log(`FAIL  ${c.in}`);
    if (!ruOk) console.log(`        RU  expected: ${c.ru}\n            got:      ${r.ru}`);
    if (!enOk) console.log(`        EN  expected: ${c.en}\n            got:      ${r.en}`);
    if (!compOk) console.log(`        complete expected ${c.complete} got ${r.complete}`);
  }
}
console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
