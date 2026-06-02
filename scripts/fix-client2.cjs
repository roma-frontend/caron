const fs = require('fs');
const p = 'C:/Users/namel/Desktop/online-shop/src/app/admin/products/add/page.tsx';
let c = fs.readFileSync(p, 'utf8');
// The first line has Armenian chars: use + ԱԳՏԱԱ + client
// Replace the corrupted directive
const armenian = '\u0531\u0533\u054F\u0531\u0531';
c = c.replace('use' + armenian + 'client', 'use client');
fs.writeFileSync(p, c, 'utf8');
console.log('Fixed. First line:', JSON.stringify(c.split('\n')[0]));
