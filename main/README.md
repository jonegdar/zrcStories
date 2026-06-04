# schoolEventTracker (ZRC Stories)

## Dev

- Install deps: `npm i`
- Start: `npm run dev`

The local backend will now start automatically when the Vite dev server launches. It listens on `http://localhost:8000` and is used by the Facebook importer.

For Vercel deployments, configure the frontend environment variable:
- `VITE_FB_EXTRACTOR_API_URL=https://your-backend-url`

## Admin Login (Step 1)

This project has a **single admin account** gate for accessing admin-only pages.

- Login route: `/admin/login`
- After correct username + password, you must also enter a displayed 4-digit PIN.

Note: this is a **front-end** gate (best for a school project). For real security, add a server-side check later.

---

Built with React + Vite.
