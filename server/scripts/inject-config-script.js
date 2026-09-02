const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, '..', '..', 'public', 'pages');
const SCRIPT_TAG = '  <script src="/config.js"></script>';

const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.html'));

let updated = 0;
let skipped = 0;
for (const file of files) {
  const filePath = path.join(pagesDir, file);
  const content = fs.readFileSync(filePath, 'utf8');

  if (content.includes('src="/config.js"')) {
    skipped++;
    continue;
  }

  // Insert the config.js script tag right before the first <script
  // tag in the file. This ensures config.js loads before any ES
  // module that imports api.js, so window.NOLIDA_API_BASE is set
  // before api.js evaluates API_BASE.
  const match = content.match(/<script[\s>]/);
  if (!match) {
    console.log(`SKIP ${file} (no <script> tag found)`);
    continue;
  }

  const idx = match.index;
  const newContent = content.slice(0, idx) + SCRIPT_TAG + '\n' + content.slice(idx);
  fs.writeFileSync(filePath, newContent, 'utf8');
  console.log(`OK   ${file}`);
  updated++;
}

console.log(`\nUpdated: ${updated}, Already had config.js: ${skipped}`);
