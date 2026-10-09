# Pankaja Motobay — Final Netlify + Supabase Setup

This project uses:
- GitHub for the code
- Netlify for the website + Netlify Function
- Supabase Auth for the admin account
- Supabase Database for reviews, appointments, messages and analytics

## 1. Supabase

The project already contains `supabase-schema.sql`.

In Supabase:
1. Open **SQL Editor**.
2. Run the full `supabase-schema.sql` once.
3. Open **Authentication → Users**.
4. Make sure the admin user exists.
5. The admin email in Supabase must exactly match `ADMIN_EMAIL` in Netlify.
6. Make sure the admin user has a password and can sign in with email/password.

## 2. Netlify environment variables

Open your Netlify site:

**Site configuration → Environment variables**

Add these six variables:

- `SUPABASE_URL` = Supabase Project URL
- `SUPABASE_ANON_KEY` = Supabase anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` = Supabase service-role key
- `ADMIN_NAME` = `Pankaja Motobay Admin`
- `ADMIN_EMAIL` = the exact Supabase admin email
- `SESSION_SECRET` = a long random secret, for example a 40+ character random string

### Important security rule

Never put `SUPABASE_SERVICE_ROLE_KEY` inside `public/` JavaScript, HTML, GitHub, or screenshots.

## 3. Deploy

After adding/updating the Netlify environment variables:

1. Save the variables.
2. Go to **Deploys**.
3. Click **Trigger deploy → Deploy site** (or push the project to GitHub if Netlify is connected to the repository).
4. Wait until the deploy finishes.

A redeploy is required after changing environment variables.

## 4. Test the API

Open:

`https://YOUR-SITE.netlify.app/api/health`

You should see JSON showing:
- `ok: true`
- `supabaseUrl: true`
- `supabaseServiceRoleKey: true`
- `adminEmail: true`
- `sessionSecret: true`

`supabaseAnonKey` should also be `true` because it is used for the Supabase email/password login.

The health endpoint never displays the actual secret values.

## 5. Admin login

Open:

`https://YOUR-SITE.netlify.app/admin/`

or

`https://YOUR-SITE.netlify.app/admin/login.html`

Use the SAME email and password as the Supabase Auth admin user.

After login, the dashboard should show:
- Admin profile
- Website statistics
- Customer reviews
- Approve / Reject
- Appointments
- Appointment status
- Customer messages

## 6. Reviews

Customer:
1. Open the Reviews section.
2. Select 1–5 stars.
3. Submit the review.

The review is saved as `pending`.

Admin:
1. Login.
2. Open Customer Reviews.
3. Click **Approve**.

Only approved reviews appear on the public website.

## 7. Online appointments

Customer:
1. Fill the booking form.
2. Submit.
3. The booking is saved in Supabase.
4. WhatsApp opens with the booking details.

Admin:
1. Login.
2. Open Appointments.
3. Change the status to Pending / Confirmed / Completed / Cancelled.

## If something still fails

First check `/api/health`.

- If `supabaseUrl` is false → `SUPABASE_URL` is missing.
- If `supabaseServiceRoleKey` is false → `SUPABASE_SERVICE_ROLE_KEY` is missing.
- If `adminEmail` is false → `ADMIN_EMAIL` is missing.
- If `sessionSecret` is false → `SESSION_SECRET` is missing.
- If `supabaseAnonKey` is false → `SUPABASE_ANON_KEY` is missing.

Then check the Netlify deploy logs under **Functions**.

