# noLIDA Deployment Guide

This guide deploys noLIDA as three separate services:

- **Supabase** — Managed PostgreSQL
- **Render** — Node.js backend (Express)
- **Vercel** — Static frontend (HTML/CSS/JS)
- **GitHub** — Source of truth, auto-deploys to both Render and Vercel

The Express backend is **not** converted to serverless. It runs as a long-lived Node service on Render. The frontend is pure static files served from Vercel's global CDN.

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
   DATABASE_URL=... node server/seeds/seed.js
   DATABASE_URL=... node server/seeds/seedAdmin.js
   ```

   Record the admin email/password the seed script prints.

---

## 2. Render (backend)

1. Push this repo to GitHub
2. Go to https://render.com → **New → Blueprint**
3. Connect the GitHub repo. Render will read `render.yaml` and provision a `nolida-api` web service.
4. In the Render dashboard for `nolida-api` → **Environment**, set the values flagged `sync: false` in `render.yaml`. The most important:

   - `DATABASE_URL` — the Supabase Transaction pooler URL from step 1
   - `CORS_ORIGIN`, `FRONTEND_URL`, `APP_URL` — your Vercel URL (you can set this now to a placeholder and update after step 3)
   - `FLUTTERWAVE_SECRET_KEY`, `GOOGLE_MAPS_API_KEY`, etc. — only what you use

5. Add a **Persistent Disk** to the service:
   - Mount path: `/opt/render/project/src/uploads`
   - Size: 1 GB (or more if you store many images)
   - This is where uploaded files live. They survive deploys.

6. Wait for the first deploy. Visit `https://nolida-api.onrender.com/api/v1/health` — should return `{"success": true}`.

7. (Free tier only) Render spins down after 15 min of inactivity. First request takes ~30s. Upgrade to a paid plan to avoid this.

---

## 3. Vercel (frontend)

1. Go to https://vercel.com → **Add New → Project** → import the GitHub repo.
2. Vercel auto-detects `vercel.json` and uses it. You should NOT need to set the framework to "Other".
3. In **Project Settings → Environment Variables**, add:

   | Key | Value |
   |---|---|
   | `NOLIDA_API_BASE` | `https://nolida-api.onrender.com` |
   | `NOLIDA_FRONTEND_URL` | (your Vercel URL, e.g. `https://nolida.vercel.app`) |

   Note: these are read by `public/js/api.js` via `window.NOLIDA_*`. Vercel only injects them at build time as `process.env.*`, so you need a small Vercel Edge config or build step. The simplest path: copy `public/config.example.js` to `public/config.js`, edit the values, and commit it. The `.vercelignore` file is set to ignore `config.js` so it doesn't get deployed — but for a static site, committing the file with the URLs is the easiest path.

   **Actually**, Vercel supports build-time env vars with a tiny build step. If you want zero-touch env injection, add this to `vercel.json`:

   ```json
   "buildCommand": "node build-config.js"
   ```

   And create `build-config.js` that reads `process.env.NOLIDA_API_BASE` and writes `public/config.js`. Otherwise, just commit a `public/config.js` with hardcoded URLs.

4. Update Render's `CORS_ORIGIN` and `FRONTEND_URL` to match your actual Vercel URL.
5. Visit your Vercel URL. The frontend should load and API calls should reach the Render backend.

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
│   Vercel    │ ───▶ │   Render     │ ───▶ │  Supabase    │
│  (static)   │      │  (Express)   │      │ (Postgres)   │
│  /pages/*   │      │  /api/v1/*   │      │  port 6543   │
└─────────────┘      └──────────────┘      └──────────────┘
       │                                          ▲
       └────────────  uploads ────────────────────┘
                (Render persistent disk)
```

- Vercel CDN serves HTML/CSS/JS globally
- Render runs the Express API, talks to Supabase Postgres
- Render's persistent disk holds uploaded images
- GitHub is the source of truth; pushes trigger auto-deploys

---

## What's intentionally NOT done

- **No serverless functions.** Vercel is used only as a static host. The Express backend is unchanged.
- **No migration to TypeScript, React, Next.js, etc.** The stack stays vanilla HTML + Express + SQL.
- **No Supabase Auth or Storage.** Supabase is used only as a Postgres host. The existing JWT auth and local file uploads are unchanged.
- **No CI workflow.** Tests run locally. Add a `.github/workflows/test.yml` later if you want CI.
