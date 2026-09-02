// Template for public/config.js. Copy this file to public/config.js
// and fill in your deployed API base URL. The .gitignore keeps
// config.js out of git so each developer can have their own local
// values. For Vercel deploys, you DO want to commit config.js with
// the production URL (it's a public URL, not a secret).
//
// On Vercel, this file is served as a regular static JS file, so
// every page that loads /js/api.js (which reads these globals) will
// see your API URL.
//
// Leave both empty for local dev — the frontend will fall back to
// same-origin /api/v1/* which hits the local Express server.

window.NOLIDA_API_BASE = 'nolida-production.up.railway.app';
window.NOLIDA_FRONTEND_URL = 'http://no-lida-blush.vercel.app/';
