const fs = require('fs');
const p = 'C:/Users/namel/Desktop/online-shop/src/app/admin/products/[id]/edit/page.tsx';
let c = fs.readFileSync(p, 'utf8');
// Change "Қаңақи қайл" (Qty Step) to "Артикул" (SKU)
c = c.replace(
  '<Label>\u0554\u0561\u0576\u0561\u056F\u056B \u0584\u0561\u0575\u056C</Label><Input type="number" value={form.qtyStep ?? \'\'} onChange={(e) => setForm({ ...form, qtyStep: Number(e.target.value) })} className="h-11" placeholder="1" />',
  '<Label>\u0531\u0580\u057F\u056B\u056F\u0578\u0582\u056C</Label><Input value={form.sku ?? \'\'} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="h-11 font-mono tracking-wider" placeholder="ANI-A7F3" />'
);
fs.writeFileSync(p, c, 'utf8');
console.log('Fixed');
