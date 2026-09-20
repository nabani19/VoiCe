const fs = require('fs');
const index = fs.readFileSync('web/index.html', 'utf8');
const append = fs.readFileSync('web/append.html', 'utf8');
const newIndex = index.replace('</body>', append + '\n</body>');
fs.writeFileSync('web/index.html', newIndex);
console.log('Successfully injected append.html into index.html');
