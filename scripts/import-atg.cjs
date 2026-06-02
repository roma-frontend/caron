const XLSX = require('xlsx');
const fs = require('fs');

// Read ATG codes from the provided Excel file
const wb = XLSX.readFile(process.argv[2] || 'C:/Users/namel/Downloads/ck_atgaa_hhk_1406n_2014_dec_2023_65859691778e6.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

// Skip header row, map to { code, name }
const codes = data.slice(1).map((r) => ({
  code: String(r[0]).trim(),
  name: String(r[1]).trim(),
})).filter((c) => c.code && c.name && /^\d{4}$/.test(c.code));

// Generate TypeScript file with the codes
let ts = `// Auto-generated ATG codes. Run: node scripts/import-atg.mjs
export const ATG_CODES: { code: string; name: string }[] = [\n`;

for (const c of codes) {
  ts += `  { code: '${c.code}', name: '${c.name}' },\n`;
}
ts += `];\n`;

const outPath = 'C:/Users/namel/Desktop/online-shop/src/lib/atgCodes.ts';
fs.writeFileSync(outPath, ts, 'utf8');
console.log(`Exported ${codes.length} ATG codes to ${outPath}`);
