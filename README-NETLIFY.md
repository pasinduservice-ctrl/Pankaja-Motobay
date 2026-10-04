# Pankaja Motobay - Netlify deployment

This version is prepared for Netlify Functions + Supabase. The customer website is published from `public/`; `/api/*` is routed to the Netlify function in `netlify/functions/api.js`. Admin pages are under `/admin` and admin data is protected by a signed HTTP-only cookie.

## Before deploying
1. Create a Supabase project.
2. In Supabase SQL Editor, run `supabase-schema.sql`.
3. Create an Auth user with the same email/password you want for the Pankaja Motobay admin. Do not expose the password in code.
4. In Netlify Site settings > Environment variables add:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (keep secret; never put it in frontend code)
   - `ADMIN_NAME`
   - `ADMIN_EMAIL`
   - `SESSION_SECRET`
5. Deploy this repository to Netlify with the included `netlify.toml`.
6. Test `/`, `/admin`, booking, review submission/approval, messages and logout.

Do not commit `.env` files or Supabase service-role keys to GitHub.
