const XLSX = require('xlsx');
const { ConvexHttpClient } = require('convex/browser');
const { api } = require('../convex/_generated/api');

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

async function main() {
  const wb = XLSX.readFile(process.argv[2] || 'C:/Users/namel/Downloads/ck_atgaa_hhk_1406n_2014_dec_2023_65859691778e6.xlsx');
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
  const codes = rows.slice(1)
    .map((r) => ({ code: String(r[0]).trim(), name: String(r[1]).trim() }))
    .filter((c) => c.code && c.name && /^\d{4}$/.test(c.code));

  console.log(`Seeding ${codes.length} ATG codes...`);
  const result = await client.mutation(api.atg.seed, { codes });
  console.log(result);
}

main().catch(console.error);
