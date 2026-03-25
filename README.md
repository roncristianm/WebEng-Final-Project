# Nexxus · BHSA

A role-based learning platform for Bataan High School for the Arts.

This repo is a **Vite + React** single-page app backed by **Firebase (Auth, Firestore, Storage)**, plus two backend pieces:
- **sheets-backend** (Express): Google Sheets integration + email flows (verification, password reset)
- **functions** (Firebase Cloud Functions): automatic email notifications (Firestore triggers) + scheduled deadline reminders

## Project structure (high-level)

```
.
├─ src/                  React app (pages, components, services)
├─ sheets-backend/       Express API for Google Sheets + email routes
├─ functions/            Firebase Cloud Functions (email notifications + scheduler)
├─ firestore.rules       Firestore security rules
├─ firebase.json         Firebase hosting + rules configuration
└─ vite.config.js        Vite dev server + proxy (/sheets-api → localhost:4000)
```

## Local development

### Prereqs
- Node.js 18+
- A Firebase project with Auth + Firestore + Storage enabled
- A Google Cloud service account JSON that can access:
   - Google Sheets API for the class grade sheets
   - Firebase Admin (used by the backend for verification/password reset helpers)

### 1) Frontend (Vite)

```bash
npm install
npm run dev
```

Runs at `http://localhost:3000`.

### 2) Sheets backend (Express)

In another terminal:

```bash
cd sheets-backend
npm install
npm run dev
```

Runs at `http://localhost:4000`.

The frontend calls this backend via the Vite proxy:
- Frontend uses `/sheets-api/...`
- Vite proxies `/sheets-api` → `http://localhost:4000`

### 3) Firebase Cloud Functions (optional for local)

If you want to emulate the notification emails + scheduler locally:

```bash
cd functions
npm install
npm run serve
```

## Configuration

### Firebase (frontend)

Firebase client initialization is in `src/config/firebase.js`.

If you fork this project, replace the Firebase config with your own Firebase project settings.

### Sheets backend env vars

The Express backend supports credentials via either a local file or env vars:

- Credentials (pick one):
   - `sheets-backend/credentials.json` (local dev only; do not commit)
   - `GOOGLE_SHEETS_KEY_FILE` (path to a JSON file)
   - `GOOGLE_SHEETS_CREDENTIALS` (service account JSON as a string)

- URLs / CORS:
   - `APP_URL` (comma-separated allowed origins; used for CORS + redirects)
   - `BACKEND_URL` (used to build verification links in some flows)

- Email (Brevo Transactional Email API):
   - `BREVO_API_KEY`
   - `BREVO_FROM_EMAIL` (optional; falls back to other values if omitted)

### Cloud Functions env vars

Cloud Functions send emails via Brevo SMTP. Configure these in the Functions environment (prefer Firebase Secrets, not committed `.env` files):

- `BREVO_SMTP_LOGIN`
- `BREVO_SMTP_KEY`
- `BREVO_FROM_EMAIL` (optional)
- `APP_URL` (base URL used in email links)

## Key features (quick map)

- Auth: signup/login, role-based dashboards (student/teacher)
- Email verification required before dashboard access
- Classes: create (teacher), join/leave (student), roster management
- Assignments: create/edit/delete, per-student submission tracking, optional grade sync to Google Sheets
- Announcements: create/delete, per-class feeds
- Materials: upload files to Firebase Storage, link detection in descriptions
- Calendar: consolidated assignment/announcement events
- Automated emails:
   - Firestore triggers (new assignment/announcement/material)
   - Scheduled deadline reminders

For a fuller inventory of services/endpoints, see FEATURE_LIST.md.

## Scripts

Frontend:
- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run lint`

Sheets backend:
- `npm run dev` (in `sheets-backend/`)
- `npm start` (in `sheets-backend/`)

Functions:
- `npm run serve` (in `functions/`)
- `npm run deploy` (in `functions/`)

## Deployment notes

- Frontend can be deployed to Firebase Hosting (see `firebase.json`) or Vercel (see `vercel.json`).
- Deploy the sheets backend somewhere public (Railway/Render/etc). Then set `VITE_BACKEND_URL` in the frontend so it calls the backend directly in production.

## Security note

Do not commit secrets (service-account JSON, Brevo keys, SMTP passwords) to git. If any credentials were committed during development, rotate them.

## License

Educational project.