# Pankaja Motobay – Final Website

## Included fixes
- WhatsApp buttons and floating WhatsApp button with visible "WhatsApp" label
- Vehicle booking for Bike, Three-Wheeler and Car
- Booking records saved to SQLite and sent to WhatsApp
- Customer review star selection and submission
- Admin approve/reject/pending review controls
- Approved reviews displayed on the public website
- Admin profile, email display and logout
- Dashboard statistics
- Appointment status management
- Customer message management
- Analytics/page-view tracking
- Mobile responsive admin and customer pages
- Cleaned broken browser JavaScript and duplicate WhatsApp opening
- Production session cookie handling

## Important deployment note
This is a Node.js + Express website with SQLite. It is **not a static-only website**, so uploading only the `public` folder to Netlify/GitHub Pages will not run the admin/backend APIs.

Use a Node.js hosting service such as Render, Railway, or another server host.

## Environment variables
Copy `.env.example` to `.env` on the server and set:
- `SESSION_SECRET`
- `ADMIN_NAME`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD_HASH`
- `NODE_ENV=production`

Never upload the real `.env` file to a public Git repository.

## Start command
```bash
npm install
npm start
```

## Admin
Open:
`/admin`

The admin login uses `ADMIN_EMAIL` and `ADMIN_PASSWORD_HASH`.

## SQLite
The database is created automatically in `database/motobay.db`.

For production, use a host with persistent storage if you want bookings, reviews, messages and analytics to survive restarts/deployments.
