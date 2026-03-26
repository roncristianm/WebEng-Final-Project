# GitHub Actions — Secrets Setup Guide
## Nexxus · BHSA

Go to: **GitHub repo → Settings → Secrets and variables → Actions → New repository secret**

---

## Required Secrets

### Firebase Hosting & Functions Deploy

| Secret | How to get it |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | Firebase Console → Project Settings → Service Accounts → Generate new private key. Paste the entire JSON content. |
| `FIREBASE_TOKEN` | Run `firebase login:ci` locally → copy the token printed. Used for CLI deploys (functions, rules). |

### Vite / Frontend Firebase Config

These come from: **Firebase Console → Project Settings → Your apps → Web app → Config**

| Secret | Firebase config key |
|---|---|
| `VITE_FIREBASE_API_KEY` | `apiKey` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `VITE_FIREBASE_PROJECT_ID` | `projectId` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `storageBucket` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
| `VITE_FIREBASE_APP_ID` | `appId` |

---

## Optional: Cloud Functions Runtime Secrets
If your functions read env vars (Brevo SMTP, etc.), set them via Firebase:
```bash
firebase functions:secrets:set BREVO_SMTP_LOGIN
firebase functions:secrets:set BREVO_SMTP_KEY
firebase functions:secrets:set BREVO_FROM_EMAIL
firebase functions:secrets:set APP_URL
```
These are stored in Google Secret Manager and do NOT go in GitHub Secrets.

---

## How to Add Secrets in GitHub

1. Go to your repo on GitHub
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Enter the name (e.g. `FIREBASE_TOKEN`) and paste the value
5. Click **Add secret**

Repeat for each secret in the table above.
