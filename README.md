# Nexxus · BHSA

A role-based learning platform for Bataan High School for the Arts.

This repo is a **Vite + React** single-page app backed by **Firebase (Auth, Firestore)**, plus two backend pieces:
- **sheets-backend** (Express): Google Sheets integration + email flows (verification, password reset)
- **functions** (Firebase Cloud Functions): automatic email notifications (Firestore triggers) + scheduled deadline reminders

## Setup

### Requirements
- Node.js 18+
- A Firebase project with Auth + Firestore enabled
- A Google Cloud service account JSON that can access:
   - Google Sheets API for the class grade sheets
   - Firebase Admin (used by the backend for verification/password reset helpers)

### Run locally

1) Frontend (Vite)

```bash
npm install
npm run dev
```

Runs at `http://localhost:3000`.

2) Sheets backend (Express)

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

3) Firebase Cloud Functions (optional for local)

If you want to emulate the notification emails + scheduler locally:

```bash
cd functions
npm install
npm run serve
```

### Config notes

Firebase client initialization is in `src/config/firebase.js`.
If you fork this project, replace the Firebase config with your own Firebase project settings.

The Express backend supports credentials via either a local file or env vars.

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

Cloud Functions send emails via Brevo SMTP. Configure these in the Functions environment (prefer Firebase Secrets, not committed `.env` files):

- `BREVO_SMTP_LOGIN`
- `BREVO_SMTP_KEY`
- `BREVO_FROM_EMAIL` (optional)
- `APP_URL` (base URL used in email links)

## Links

- Frontend (local): `http://localhost:3000`
- Sheets backend (local): `http://localhost:4000/health`
- Sheets backend via Vite proxy (local): `http://localhost:3000/sheets-api/health`
- Email API base (local, via proxy): `http://localhost:3000/sheets-api/email`
- Firebase project id (from `.firebaserc`): `webeng-final-project-a2e02`

## Features

- Auth: signup/login, role-based dashboards (student/teacher)
- Email verification required before dashboard access
- Password reset email (branded)
- Classes: create (teacher), join/leave (student), roster management
- Assignments: create/edit/delete, per-student submission tracking, optional grade sync to Google Sheets
- Announcements: create/delete, per-class feeds
- Calendar: consolidated assignment/announcement events
- Automated emails:
   - Firestore triggers (new assignment/announcement)
   - Scheduled deadline reminders

   working? No?