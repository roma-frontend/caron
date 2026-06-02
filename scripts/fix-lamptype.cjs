const fs = require('fs');
const p = 'C:/Users/namel/Desktop/online-shop/convex/seedFilters.ts';
let c = fs.readFileSync(p, 'utf8');
c = c.replace(
  /{ name: '.*?', slug: 'lampType', type: 'select', options: \['LED','.*?','.*?','.*?'\] },/,
  "{ name: '\u054F\u0565\u057D\u0561\u056F', slug: 'lampType', type: 'select', options: ['LED', '\u0540\u0561\u056C\u0578\u0563\u0565\u0576', '\u0554\u057D\u0565\u0576\u0578\u0576', 'HID'] },"
);
fs.writeFileSync(p, c, 'utf8');
console.log('Fixed lampType to Տեսակ');
