const fs = require('fs');
const path = 'C:\\Users\\namel\\Desktop\\online-shop\\convex\\filters.ts';
let c = fs.readFileSync(path, 'utf8');
c = c.replace(/name: '.*?', slug: 'type'/, "name: '\u054F\u0565\u057D\u0561\u056F', slug: 'type'");
fs.writeFileSync(path, c, 'utf8');
console.log('Fixed: ' + JSON.stringify(c.includes('\u054F\u0565\u057D\u0561\u056F')));
