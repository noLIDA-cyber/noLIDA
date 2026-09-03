const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, '..', '..', 'public', 'pages');

// Match any leading whitespace + <a ...> line, the svg line, the
// text "My Business" (possibly with leading whitespace), the </a>,
// and rewrite the text portion to a span we can target from JS.
const pattern = /(<a href="\/provider" id="drawer-provider-dashboard"[^>]*>\s*<svg[\s\S]*?<\/svg>\s*)My Business(\s*<\/a>)/;

const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.html'));
let updated = 0;
let skipped = [];
for (const file of files) {
  const filePath = path.join(pagesDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('drawer-my-business-label')) continue;
  if (!pattern.test(content)) {
    skipped.push(file);
    continue;
  }
  const newContent = content.replace(pattern, '$1<span id="drawer-my-business-label">My Business</span>$2');
  fs.writeFileSync(filePath, newContent, 'utf8');
  updated++;
}
console.log(`Updated ${updated} files`);
if (skipped.length) {
  console.log('Skipped (no provider link found):');
  for (const f of skipped) console.log('  ' + f);
}
