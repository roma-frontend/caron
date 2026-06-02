const fs = require('fs');
const p = 'C:/Users/namel/Desktop/online-shop/src/app/admin/products/add/page.tsx';
let c = fs.readFileSync(p, 'utf8');
// Fix corrupted 'use client' directive
c = c.replace("'use\u0531\u0533\u054F\u0531\u0531client'", "'use client'");
fs.writeFileSync(p, c, 'utf8');
console.log('Fixed use client directive');
