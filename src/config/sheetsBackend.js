// Central place to resolve the sheets-backend base URL.
// - Dev: use the Vite proxy at /sheets-api (see vite.config.js)
// - Prod: set VITE_BACKEND_URL to your Railway URL (e.g. https://your-app.railway.app)

function normalizeBaseUrl(url) {
  return String(url || '').trim().replace(/\/+$/, '')
}

const envBase = normalizeBaseUrl(import.meta.env.VITE_BACKEND_URL)

// If VITE_BACKEND_URL is set, call the backend directly (cross-origin).
// Otherwise, fall back to the local dev proxy.
export const SHEETS_API_BASE = envBase || '/sheets-api'

export const SHEETS_EMAIL_API_BASE = `${SHEETS_API_BASE}/email`
