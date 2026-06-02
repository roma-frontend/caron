const fs = require('fs');
const files = [
  'C:/Users/namel/Desktop/online-shop/src/app/admin/products/add/page.tsx',
  'C:/Users/namel/Desktop/online-shop/src/app/admin/products/[id]/edit/page.tsx',
];
for (const p of files) {
  let c = fs.readFileSync(p, 'utf8');
  c = c.replace(
    '<Label>АТГ код</Label>',
    '<Label>\u0531\u0533\u054F\u0531\u0531 \u056F\u0578\u0564</Label>'
  );
  fs.writeFileSync(p, c, 'utf8');
  console.log('Fixed:', p);
}
