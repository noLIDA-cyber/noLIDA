const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, '..', '..', 'public', 'pages');
const OLD = '?v=16';
const NEW = '?v=17';

let updated = 0;
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.html'));
for (const file of files) {
  const filePath = path.join(pagesDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  if (content.includes(OLD)) {
    fs.writeFileSync(filePath, content.replaceAll(OLD, NEW), 'utf8');
    updated++;
  }
}
console.log(`Updated ${updated} HTML files from v=16 to v=17`);

// Also update the dynamic imports in app.js
const appJsPath = path.join(__dirname, '..', '..', 'public', 'js', 'app.js');
let appContent = fs.readFileSync(appJsPath, 'utf8');
const dynamicImportPattern = /import\('\.\/modules\/([a-z-]+)\.js'\)/g;
const before = appContent.length;
appContent = appContent.replace(dynamicImportPattern, "import('./modules/$1.js?v=17')");
if (appContent.length !== before) {
  fs.writeFileSync(appJsPath, appContent, 'utf8');
  console.log('Updated dynamic imports in app.js to v=17');
}
