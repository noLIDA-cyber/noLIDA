const normalize = (s) => s.replace(/\/+$/, '').toLowerCase();

const cases = [
  // [CORS_ORIGIN env, request origin, should allow?]
  ['https://no-lida-blush.vercel.app', 'https://no-lida-blush.vercel.app', true],
  ['https://no-lida-blush.vercel.app', 'http://no-lida-blush.vercel.app', false],
  ['https://no-lida-blush.vercel.app/', 'https://no-lida-blush.vercel.app', true],
  ['http://no-lida-blush.vercel.app/', 'https://no-lida-blush.vercel.app', false],
  ['https://no-lida-blush.vercel.app,http://localhost:3000', 'http://localhost:3000', true],
  ['https://no-lida-blush.vercel.app,http://localhost:3000', 'https://no-lida-blush.vercel.app', true],
  ['https://no-lida-blush.vercel.app,http://localhost:3000', 'https://evil.com', false],
  [undefined, 'https://anything.com', true],
  ['', 'https://anything.com', true],
];

let failed = 0;
for (const [envVal, origin, expected] of cases) {
  const allowedList = (envVal || '').split(',').map(o => o.trim()).filter(Boolean);
  let got;
  if (allowedList.length === 0) {
    got = true; // permissive when not configured
  } else {
    got = Boolean(allowedList.find(o => normalize(o) === normalize(origin)));
  }
  const ok = got === expected;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  env=${JSON.stringify(envVal)} origin=${JSON.stringify(origin)} expected=${expected} got=${got}`);
}
process.exit(failed === 0 ? 0 : 1);
