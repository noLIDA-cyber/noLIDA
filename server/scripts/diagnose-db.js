const { Client } = require('pg');
const dns = require('dns').promises;

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('Set DATABASE_URL first, e.g.:');
  console.error('  $env:DATABASE_URL="postgres://..."; node server/scripts/diagnose-db.js');
  process.exit(2);
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const tryConnect = async (label, connStr) => {
  const client = new Client({
    connectionString: connStr,
    connectionTimeoutMillis: 5000,
    ssl: { rejectUnauthorized: false },
  });
  process.stdout.write(`\n[${label}] trying... `);
  const t0 = Date.now();
  try {
    await client.connect();
    const r = await client.query('SELECT current_database(), current_user, version()');
    console.log(`OK (${Date.now() - t0}ms)`);
    console.log('  database:', r.rows[0].current_database);
    console.log('  user    :', r.rows[0].current_user);
    console.log('  version :', r.rows[0].version.split(' ').slice(0, 2).join(' '));
    await client.end();
    return true;
  } catch (e) {
    console.log(`FAIL (${Date.now() - t0}ms): ${e.message}`);
    try { await client.end(); } catch {}
    return false;
  }
};

(async () => {
  let parsed;
  try {
    parsed = new URL(url);
  } catch (e) {
    console.error('Could not parse DATABASE_URL as a URL.');
    console.error('  Make sure it starts with postgresql:// or postgres://');
    process.exit(2);
  }

  const host = parsed.hostname;
  const port = parsed.port || '5432';
  const db   = parsed.pathname.replace(/^\//, '') || 'postgres';
  const user = decodeURIComponent(parsed.username || '');
  const pass = decodeURIComponent(parsed.password || '');

  console.log('=== DB connection diagnostics ===');
  console.log('host :', host);
  console.log('port :', port);
  console.log('db   :', db);
  console.log('user :', user);
  console.log('pass length:', pass.length, '(if this looks wrong, the password may have URL-encoding issues)');

  // Step 1: DNS
  try {
    const addrs = await dns.resolve4(host);
    console.log('DNS  : OK ->', addrs.join(', '));
  } catch (e) {
    console.log('DNS  : FAIL ->', e.message);
    console.log('\n  The hostname does not resolve. Check the URL is correct.');
    process.exit(1);
  }

  // Step 2: TCP
  const net = require('net');
  const tcpOK = await new Promise(resolve => {
    const sock = net.createConnection({ host, port: Number(port), timeout: 5000 });
    sock.once('connect', () => { sock.end(); resolve(true); });
    sock.once('error', e => resolve(`error: ${e.code || e.message}`));
    sock.once('timeout', () => { sock.destroy(); resolve('timeout'); });
  });
  if (tcpOK !== true) {
    console.log('TCP  : FAIL ->', tcpOK);
    console.log('\n  The host is reachable but port', port, 'is not.');
    console.log('  Supabase:');
    console.log('    6543 = Transaction pooler (serverless)');
    console.log('    5432 = Direct connection (long-lived)');
    console.log('  Try the other port if you used the wrong one.');
    process.exit(1);
  }
  console.log('TCP  : OK');

  // Step 3: actual auth
  const ok = await tryConnect('as given', url);
  if (!ok) {
    console.log('\n  TCP works, so the URL is reachable, but auth failed.');
    console.log('  Most common causes:');
    console.log('   1. Wrong password (Supabase dashboard -> Database -> Reset password)');
    console.log('   2. Password contains @ # : ? / % & + and was not URL-encoded');
    console.log('   3. Project still provisioning (wait 2 min after creation)');
    console.log('   4. IP not allowlisted (Supabase: Settings -> Database -> Network -> allow your IP)');
  } else {
    console.log('\nAll good. You can now run: npm run bootstrap');
  }
})();
