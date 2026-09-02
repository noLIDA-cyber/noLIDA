# noLIDA Deployment Guide

This guide deploys noLIDA as three separate services:

- **Supabase** — Managed PostgreSQL
- **Railway** — Node.js backend (Express)
- **Vercel** — Static frontend (HTML/CSS/JS)
- **GitHub** — Source of truth, auto-deploys to both Railway and Vercel

The Express backend is **not** converted to serverless. It runs as a long-lived Node service on Railway. The frontend is pure static files served from Vercel's global CDN.

---

## 1. Supabase (database)

1. Create a project at https://supabase.com
2. Wait for the database to provision (~2 minutes)
3. Go to **Project Settings → Database → Connection string → URI**
4. Copy the **Transaction pooler** URL (port `6543`, not `5432`):

   ```
   postgresql://postgres.PROJECTREF:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true
   ```

5. **Bootstrap the database** — runs all 16 migrations + both seeds in one command. From your local machine:

   ```bash
   export DATABASE_URL='<paste the Supabase transaction-pooler URL here>'
   npm run bootstrap
   ```

   This runs, in order:
   - `npm run migrate`  — creates the `schema_migrations` table, then applies every `server/migrations/*.sql` that hasn't been applied
   - `npm run seed`     — inserts the 15 categories and 10 capabilities (idempotent)
   - `npm run seed:admin` — creates the admin user `nolidacreations@gmail.com` (password `nolidaiscomingsoon100.`) and grants all roles/permissions

   If `npm run bootstrap` errors with `ENOTFOUND` or connection refused, the URL is wrong (pooler not direct, wrong region, or wrong password).

   If you don't have `pg` set up but the URL works, you can also run each step manually:

   ```bash
   npm run migrate
   npm run seed
   npm run seed:admin
   ```

6. Verify in the Supabase dashboard:
   - **Table Editor → users** should have one row: `nolidacreations@gmail.com`
   - **Table Editor → categories** should have 15 rows
   - **Table Editor → schema_migrations** should have 16 rows

7. Re-running `npm run seed:admin` later is safe and idempotent: it re-hashes the password and sets status to `active`. Use this to reset the admin password if you forget it.

---

## 2. Railway (backend)

1. Push this repo to GitHub
2. Go to https://railway.app → **New Project → Deploy from GitHub repo** → select this repo
3. Railway auto-detects Node and uses the `Procfile` (`web: node server/app.js`)
4. In **Variables**, set the values that `railway.toml` did not pre-fill. The most important:

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | the Supabase Transaction pooler URL from step 1 (REQUIRED — without this, the backend will crash-loop on startup) |
   | `JWT_ACCESS_SECRET` | a random 32+ char string (e.g. `openssl rand -hex 32`) |
   | `JWT_REFRESH_SECRET` | another random 32+ char string |
   | `CORS_ORIGIN` | your Vercel URL (placeholder OK for now, update in step 3) |
   | `FRONTEND_URL` | your Vercel URL |
   | `APP_URL` | your Vercel URL |
   | `FLUTTERWAVE_SECRET_KEY` | only if you use payments |
   | `GOOGLE_MAPS_API_KEY` | only if you use maps |

   **If `DATABASE_URL` is not set**, the service will keep restarting in a loop and the healthcheck will fail. The deploy logs will show `Database connection failed`.

5. **Persistent disk (paid plans only):**
   - Service → **Settings → Volumes → Add Volume**
   - Mount path: `/app/uploads`
   - Size: 1 GB
   - Set `STORAGE_LOCAL_PATH=/app/uploads` in variables
   - This is where uploaded files live. They survive redeploys.
   - On the free trial/hobby plan, no persistent disk — uploads will be wiped on redeploy. Acceptable for a demo, not for production.

6. After deploy, Railway gives you a URL like `https://nolida-api-production.up.railway.app`. Test:

   ```bash
   curl https://nolida-api-production.up.railway.app/api/v1/health
   ```

   Should return `{"success":true,...}`.

---

## 3. Vercel (frontend)

1. Go to https://vercel.com → **Add New → Project** → import the GitHub repo.
2. Vercel auto-detects `vercel.json`. Do not change the framework setting.
3. **Critical:** create the runtime config file. From the repo root:

   ```bash
   cp public/config.example.js public/config.js
   ```

   Edit `public/config.js` to contain your Railway URL:

   ```js
   window.NOLIDA_API_BASE = 'https://nolida-api-production.up.railway.app';
   window.NOLIDA_FRONTEND_URL = 'https://nolida.vercel.app';
   ```

   `public/config.js` is gitignored so each developer can have their own without conflicts. **For Vercel, you need to commit and push it** so Vercel actually deploys it. (Yes, this means the URL is in your public repo. That's OK — it's a public URL, not a secret.)

4. Commit and push:

   ```bash
   git add public/config.js
   git commit -m "Set Vercel API base URL"
   git push
   ```

5. Vercel auto-deploys. Visit your Vercel URL. The frontend should load and API calls should reach the Railway backend.

6. **If login still fails**, the most common causes in order of frequency:
   1. **`DATABASE_URL` is not set in Railway**, or the Supabase project hasn't been bootstrapped (`npm run bootstrap` not run). Login returns "Invalid email or password" because no user exists. Check Railway's deploy logs for "Database connection failed".
   2. **`public/config.js` was not committed**, or has the wrong URL. Every API call returns 404 from Vercel. Open DevTools → Network and look at where the login POST actually went.
   3. **CORS** — `CORS_ORIGIN` on Railway does not exactly match the Vercel URL (must include `https://`, no trailing slash).
   4. The Supabase DB has the user but the password is different. Re-run `DATABASE_URL=... npm run seed:admin` to reset.

---

## 4. Local development (unchanged)

```bash
npm install
npm run dev
```

Server: http://localhost:3001
Database: your local Postgres (or point `DATABASE_URL` at Supabase)

---

## Production architecture

```
┌─────────────┐      ┌──────────────┐      ┌──────────────┐
│   Vercel    │ ───▶ │   Railway    │ ───▶ │  Supabase    │
│  (static)   │      │  (Express)   │      │ (Postgres)   │
│  /pages/*   │      │  /api/v1/*   │      │  port 6543   │
└─────────────┘      └──────────────┘      └──────────────┘
       │                                          ▲
       └────────────  uploads ────────────────────┘
              (Railway persistent volume, paid plan)
```

- Vercel CDN serves HTML/CSS/JS globally
- Railway runs the Express API, talks to Supabase Postgres
- Railway's persistent volume holds uploaded images
- GitHub is the source of truth; pushes trigger auto-deploys

---

## What's intentionally NOT done

- **No serverless functions.** Vercel is used only as a static host. The Express backend is unchanged.
- **No migration to TypeScript, React, Next.js, etc.** The stack stays vanilla HTML + Express + SQL.
- **No Supabase Auth or Storage.** Supabase is used only as a Postgres host. The existing JWT auth and local file uploads are unchanged.
- **No CI workflow.** Tests run locally. Add a `.github/workflows/test.yml` later if you want CI.
