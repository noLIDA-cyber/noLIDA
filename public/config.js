// Runtime config for the deployed frontend.
//
//   NOLIDA_API_BASE     - the Railway service URL (no trailing slash).
//                         Example: 'https://nolida-api-production.up.railway.app'
//   NOLIDA_FRONTEND_URL - the Vercel URL the site is served from.
//                         Example: 'https://nolida.vercel.app'
//
// For local development, leave both as empty strings. The frontend
// will fall back to same-origin /api/v1 which hits the local Express
// server at http://localhost:3001.
//
// IMPORTANT: this file is committed to the repo and deployed to
// Vercel. It contains a public URL, not a secret, so that's fine.

window.NOLIDA_API_BASE = 'nolida-production.up.railway.app';
window.NOLIDA_FRONTEND_URL = 'http://no-lida-blush.vercel.app/';
