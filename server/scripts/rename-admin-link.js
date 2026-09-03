const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, '..', '..', 'public', 'pages');

const oldBlock = `<a href="/admin" id="drawer-admin-dashboard" class="drawer-link" style="display: none; align-items: center; gap: 0.75rem; padding: 0.75rem 1.25rem; color: var(--theme-text-primary); text-decoration: none; font-size: var(--text-sm);">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
        Admin Dashboard
      </a>`;

const newBlock = `<a href="/admin" id="drawer-admin-dashboard" class="drawer-link" style="display: none; align-items: center; gap: 0.75rem; padding: 0.75rem 1.25rem; color: var(--theme-text-primary); text-decoration: none; font-size: var(--text-sm);">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
        Switch to Admin
      </a>`;

const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.html'));
let updated = 0;
let notFound = [];

for (const file of files) {
  const filePath = path.join(pagesDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  if (content.includes(oldBlock)) {
    fs.writeFileSync(filePath, content.replace(oldBlock, newBlock), 'utf8');
    updated++;
  } else if (content.includes('Admin Dashboard</a>')) {
    // Fallback: line was reformatted
    notFound.push(file);
  }
}

console.log(`Updated ${updated} files.`);
if (notFound.length) {
  console.log('Files that contain "Admin Dashboard</a>" but with different formatting:');
  for (const f of notFound) console.log('  ' + f);
}
