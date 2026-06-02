const fs = require('fs');
const p = 'C:/Users/namel/Desktop/online-shop/src/app/admin/products/add/page.tsx';
let c = fs.readFileSync(p, 'utf8');
const lines = c.split('\n');
// Replace first line with proper use client
lines[0] = "'use client';";
// Also ensure second line is empty
if (lines[1] && lines[1].trim() === '') lines[1] = '';
else lines.splice(1, 0, '');
c = lines.join('\n');
fs.writeFileSync(p, c, 'utf8');
console.log('Fixed first line');
