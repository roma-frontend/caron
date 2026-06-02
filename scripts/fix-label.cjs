const fs = require('fs');
const path = 'C:\\Users\\namel\\Desktop\\online-shop\\src\\app\\admin\\categories\\add\\page.tsx';
let c = fs.readFileSync(path, 'utf8');
c = c.replace(/<Label>.*?<\/Label>/, '<Label>\u053F\u0561\u0580\u0563</Label>');
fs.writeFileSync(path, c, 'utf8');
console.log('Fixed');
