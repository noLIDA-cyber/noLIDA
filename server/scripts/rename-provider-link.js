const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, '..', '..', 'public', 'pages');

const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.html'));
let updated = 0;
for (const file of files) {
  const filePath = path.join(pagesDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('Provider Dashboard')) {
    fs.writeFileSync(filePath, content.replaceAll('Provider Dashboard', 'My Business'), 'utf8');
    updated++;
  }
}
console.log(`Updated ${updated} files`);
