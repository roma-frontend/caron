const fs = require('fs');
const p = 'C:/Users/namel/Desktop/online-shop/src/app/admin/products/add/page.tsx';
let c = fs.readFileSync(p, 'utf8');
// The corrupted first line has literal Armenian chars between 'use' and 'client'
// Fix: replace the entire first line
const lines = c.split('\n');
if (lines[0].includes('use') && lines[0].includes('client') && !lines[0].includes("'use client'")) {
  lines[0] = "'use client';";
  c = lines.join('\n');
  fs.writeFileSync(p, c, 'utf8');
  console.log('Fixed first line to:', lines[0]);
} else {
  console.log('First line:', lines[0]);
}
