// One-off audit: walk the ENTIRE catalog on a Convex deployment and run the
// deterministic dictionary against every product + category name. Reports the
// names the dictionary cannot fully translate (those fall through to the LLM).
//
// Usage:  CONVEX_URL=https://<deployment>.convex.cloud  npx tsx scripts/translateAudit.mjs
import { ConvexHttpClient } from 'convex/browser';
import { dictTranslateName } from '../convex/lib/translateDict.ts';

const url = process.env.CONVEX_URL || 'https://marvelous-starfish-830.convex.cloud';
const client = new ConvexHttpClient(url);
const hasArm = (s) => /[\u0531-\u0556\u0561-\u0587]/u.test(s || '');

async function allProducts() {
  const out = [];
  let cursor = null;
  for (;;) {
    const res = await client.query('products:listPaginated', {
      paginationOpts: { numItems: 200, cursor },
    });
    out.push(...res.page);
    if (res.isDone) break;
    cursor = res.continueCursor;
  }
  return out;
}

async function main() {
  console.log(`Deployment: ${url}\n`);
  const products = await allProducts();
  const categories = await client.query('categories:listAll', {});

  const rows = [
    ...categories.map((c) => ({ kind: 'cat', name: c.name })),
    ...products.map((p) => ({ kind: 'prod', name: p.name })),
  ];

  const incomplete = [];
  const seen = new Set();
  for (const r of rows) {
    if (!r.name || seen.has(r.name)) continue;
    seen.add(r.name);
    const d = dictTranslateName(r.name);
    if (!d.complete) incomplete.push({ ...r, ru: d.ru });
  }

  console.log(`Active products: ${products.length}, categories: ${categories.length}`);
  console.log(`Distinct names checked: ${seen.size}`);
  console.log(`Names NOT fully covered by dictionary: ${incomplete.length}\n`);
  for (const r of incomplete) {
    console.log(`[${r.kind}] ${r.name}`);
    console.log(`        -> dict ru: ${r.ru}  (Armenian left: ${hasArm(r.ru)})`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
