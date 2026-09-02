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

5. Run all the project's SQL migrations against this database. From your local machine:

   ```bash
   # In Supabase SQL Editor, paste and run each file in order:
   # server/migrations/001_initial_schema.sql
   # server/migrations/002_add_theme_to_profiles.sql
   # ... up to ...
   # server/migrations/016_authorization_code_usage_nullable.sql
   ```

   Or, with `psql` pointing at the Supabase URL:

   ```bash
   for f in server/migrations/*.sql; do
     psql "$DATABASE_URL" -f "$f"
   done
   ```

6. Run the seed scripts:

   ```bash
   DATABASE_URL=<supabase-url> node server/seeds/seed.js
   DATABASE_URL=<supabase-url> node server/seeds/seedAdmin.js
   ```

   The admin seed prints the email and password. The default credentials are:
   - Email: `nolidacreations@gmail.com`
   - Password: `nolidaiscomingsoon100.`

---

## 2. Railway (backend)

1. Push this repo to GitHub
2. Go to https://railway.app → **New Project → Deploy from GitHub repo** → select this repo
3. Railway auto-detects Node and uses the `Procfile` (`web: node server/app.js`)
4. In **Variables**, set the values that `railway.toml` did not pre-fill. The most important:

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | the Supabase Transaction pooler URL from step 1 |
   | `JWT_ACCESS_SECRET` | a random 32+ char string (e.g. `openssl rand -hex 32`) |
   | `JWT_REFRESH_SECRET` | another random 32+ char string |
   | `CORS_ORIGIN` | your Vercel URL (placeholder OK for now, update in step 3) |
   | `FRONTEND_URL` | your Vercel URL |
   | `APP_URL` | your Vercel URL |
   | `FLUTTERWAVE_SECRET_KEY` | only if you use payments |
   | `GOOGLE_MAPS_API_KEY` | only if you use maps |

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

6. **If login still fails**, the most common causes are:
   - `public/config.js` was not committed, or has the wrong URL
   - Railway's `CORS_ORIGIN` does not match your Vercel URL (it must be exact, including `https://`)
   - The Supabase DB doesn't have the admin user (re-run `seedAdmin.js` with the right `DATABASE_URL`)

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
