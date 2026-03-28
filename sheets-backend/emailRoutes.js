// sheets-backend/emailRoutes.js
const express = require('express')
const { initializeApp, cert, getApps } = require('firebase-admin/app')
const { getAuth }                       = require('firebase-admin/auth')
const fs   = require('fs')
const path = require('path')

// ── Sanitizers ────────────────────────────────────────────────────────────────
function safeError(err) {
  return String(err.message || 'Unknown error').replace(/[^\w\s.,:()@\-]/g, '')
}

function sanitizeLog(val) {
  return String(val || '').replace(/[\r\n\t]/g, ' ').substring(0, 200)
}

function parseServiceAccount(raw) {
  const text = String(raw || '').trim()
  let json
  try {
    json = JSON.parse(text)
  } catch (err) {
    const repaired = text.replace(
      /("private_key"\s*:\s*")([\s\S]*?)("\s*[},])/,
      (_m, p1, p2, p3) => p1 + p2.replace(/\r?\n/g, '\\n') + p3
    )
    try {
      json = JSON.parse(repaired)
    } catch {
      throw new Error(
        'Invalid Firebase Admin credentials JSON. Prefer setting FIREBASE_ADMIN_KEY_FILE to a JSON file path, ' +
        'or set FIREBASE_ADMIN_CREDENTIALS to a single-line JSON string.'
      )
    }
  }

  if (json && json.private_key) {
    json.private_key = String(json.private_key).replace(/\\n/g, '\n')
  }
  return json
}

function ensureAdminInit() {
  if (getApps().length) return

  let credential

  if (process.env.FIREBASE_ADMIN_CREDENTIALS) {
    credential = cert(parseServiceAccount(process.env.FIREBASE_ADMIN_CREDENTIALS))
  } else if (process.env.FIREBASE_ADMIN_KEY_FILE) {
    credential = cert(parseServiceAccount(fs.readFileSync(process.env.FIREBASE_ADMIN_KEY_FILE, 'utf8')))
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    credential = cert(parseServiceAccount(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8')))
  } else {
    const localKey = path.join(__dirname, 'credentials.json')
    if (fs.existsSync(localKey)) {
      console.warn('[emailRoutes] Using sheets-backend/credentials.json for Firebase Admin. Prefer FIREBASE_ADMIN_CREDENTIALS instead.')
      credential = cert(parseServiceAccount(fs.readFileSync(localKey, 'utf8')))
    } else if (process.env.GOOGLE_SHEETS_CREDENTIALS) {
      console.warn('[emailRoutes] Using GOOGLE_SHEETS_CREDENTIALS for Firebase Admin. Prefer FIREBASE_ADMIN_CREDENTIALS instead.')
      credential = cert(parseServiceAccount(process.env.GOOGLE_SHEETS_CREDENTIALS))
    } else if (process.env.GOOGLE_SHEETS_KEY_FILE) {
      console.warn('[emailRoutes] Using GOOGLE_SHEETS_KEY_FILE for Firebase Admin. Prefer FIREBASE_ADMIN_KEY_FILE instead.')
      credential = cert(parseServiceAccount(fs.readFileSync(process.env.GOOGLE_SHEETS_KEY_FILE, 'utf8')))
    } else {
      throw new Error('No Firebase Admin credentials found. Set FIREBASE_ADMIN_CREDENTIALS (recommended) or FIREBASE_ADMIN_KEY_FILE.')
    }
  }

  initializeApp({ credential })
}

const router = express.Router()
const {
  sendEmail,
  sendBulkEmails,
  welcomeTemplate,
  announcementTemplate,
  newAssignmentTemplate,
  deadlineReminderTemplate,
  newMaterialTemplate,
  passwordResetTemplate,
  emailVerificationTemplate,
} = require('./emailService')
const {
  createVerificationToken,
  verifyToken,
  refreshVerificationToken,
} = require('./verificationService')

// ── Wrap async handlers ───────────────────────────────────────────────────────
// Fix: sanitize err.message before logging and never expose it in the response
const wrap = (fn) => (req, res) =>
  Promise.resolve(fn(req, res)).catch((err) => {
    console.error('[emailRoutes]', safeError(err))
    res.status(500).json({ success: false, error: 'Internal server error' })
  })

// ── POST /email/welcome ───────────────────────────────────────────────────────
router.post('/welcome', wrap(async (req, res) => {
  const { to, name, role } = req.body
  if (!to || !name || !role)
    return res.status(400).json({ success: false, error: 'to, name, role are required' })
  await sendEmail({ to, subject: `Welcome to Nexxus, ${name}! 🎉`, html: welcomeTemplate({ name, role }) })
  res.json({ success: true })
}))

// ── POST /email/announcement ──────────────────────────────────────────────────
router.post('/announcement', wrap(async (req, res) => {
  const { to, studentName, teacherName, className, title, content } = req.body
  if (!to || !teacherName || !className || !title || !content)
    return res.status(400).json({ success: false, error: 'to, teacherName, className, title, content are required' })

  const recipients = Array.isArray(to) ? to : [to]
  const names      = Array.isArray(studentName) ? studentName : recipients.map(() => studentName || 'Student')
  const postedAt   = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })

  const emails = recipients.map((email, i) => ({
    to: email, subject: `📢 New Announcement in ${className}: ${title}`,
    html: announcementTemplate({ studentName: names[i], teacherName, className, title, content, postedAt }),
  }))
  const { sent, failed } = await sendBulkEmails(emails)
  res.json({ success: true, sent, failed })
}))

// ── POST /email/new-assignment ────────────────────────────────────────────────
router.post('/new-assignment', wrap(async (req, res) => {
  const { to, studentName, teacherName, className, title, description, deadline, type, possibleScore } = req.body
  if (!to || !teacherName || !className || !title || !deadline || !type)
    return res.status(400).json({ success: false, error: 'to, teacherName, className, title, deadline, type are required' })

  const recipients = Array.isArray(to) ? to : [to]
  const names      = Array.isArray(studentName) ? studentName : recipients.map(() => studentName || 'Student')

  const emails = recipients.map((email, i) => ({
    to: email, subject: `📝 New Assignment in ${className}: ${title}`,
    html: newAssignmentTemplate({ studentName: names[i], teacherName, className, title, description, deadline, type, possibleScore }),
  }))
  const { sent, failed } = await sendBulkEmails(emails)
  res.json({ success: true, sent, failed })
}))

// ── POST /email/deadline-reminder ─────────────────────────────────────────────
router.post('/deadline-reminder', wrap(async (req, res) => {
  const { to, studentName, className, title, deadline, type, hoursLeft } = req.body
  if (!to || !className || !title || !deadline || !type)
    return res.status(400).json({ success: false, error: 'to, className, title, deadline, type are required' })

  const recipients = Array.isArray(to) ? to : [to]
  const names      = Array.isArray(studentName) ? studentName : recipients.map(() => studentName || 'Student')
  const hours      = hoursLeft ?? Math.round((new Date(deadline) - new Date()) / 36e5)

  const emails = recipients.map((email, i) => ({
    to: email, subject: `⏰ Reminder: "${title}" is due in ${hours}h!`,
    html: deadlineReminderTemplate({ studentName: names[i], className, title, deadline, type, hoursLeft: hours }),
  }))
  const { sent, failed } = await sendBulkEmails(emails)
  res.json({ success: true, sent, failed })
}))

// ── POST /email/new-material ──────────────────────────────────────────────────
router.post('/new-material', wrap(async (req, res) => {
  const { to, studentName, teacherName, className, description, fileCount } = req.body
  if (!to || !teacherName || !className || !description)
    return res.status(400).json({ success: false, error: 'to, teacherName, className, description are required' })

  const recipients = Array.isArray(to) ? to : [to]
  const names      = Array.isArray(studentName) ? studentName : recipients.map(() => studentName || 'Student')
  const postedAt   = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })

  const emails = recipients.map((email, i) => ({
    to: email, subject: `📎 New Material in ${className}`,
    html: newMaterialTemplate({ studentName: names[i], teacherName, className, description, fileCount, postedAt }),
  }))
  const { sent, failed } = await sendBulkEmails(emails)
  res.json({ success: true, sent, failed })
}))

// ── POST /email/password-reset ────────────────────────────────────────────────
router.post('/password-reset', wrap(async (req, res) => {
  const { to, name, resetLink } = req.body
  if (!to || !name || !resetLink)
    return res.status(400).json({ success: false, error: 'to, name, resetLink are required' })
  await sendEmail({ to, subject: '🔐 Reset Your Nexxus Password', html: passwordResetTemplate({ name, resetLink }) })
  res.json({ success: true })
}))

// ── POST /email/send-verification ─────────────────────────────────────────────
router.post('/send-verification', wrap(async (req, res) => {
  const { uid, email, name } = req.body
  if (!uid || !email || !name)
    return res.status(400).json({ success: false, error: 'uid, email, name are required' })

  const token      = await createVerificationToken(uid, email)
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000'
  const verifyLink = `${backendUrl}/email/verify?token=${token}`

  await sendEmail({
    to:      email,
    subject: '✉️ Verify your Nexxus email address',
    html:    emailVerificationTemplate({ name, verifyLink }),
  })
  res.json({ success: true })
}))

// ── POST /email/resend-verification ──────────────────────────────────────────
router.post('/resend-verification', wrap(async (req, res) => {
  const { uid, email, name } = req.body
  if (!uid || !email || !name)
    return res.status(400).json({ success: false, error: 'uid, email, name are required' })

  const token      = await refreshVerificationToken(uid, email)
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000'
  const verifyLink = `${backendUrl}/email/verify?token=${token}`

  await sendEmail({
    to:      email,
    subject: '✉️ Verify your Nexxus email address',
    html:    emailVerificationTemplate({ name, verifyLink }),
  })
  res.json({ success: true })
}))

// ── GET /email/verify?token=xxx ───────────────────────────────────────────────
router.get('/verify', wrap(async (req, res) => {
  const { token } = req.query
  const appUrl    = process.env.APP_URL || 'http://localhost:3000'

  if (!token) {
    return res.redirect(`${appUrl}/verify?error=missing_token`)
  }

  const result = await verifyToken(token)

  if (result.success) {
    return res.redirect(`${appUrl}/verify?verified=true`)
  }

  const errorCode = result.error.includes('expired')  ? 'expired'      :
                    result.error.includes('already')  ? 'already_used' : 'invalid'
  return res.redirect(`${appUrl}/verify?error=${errorCode}`)
}))

// ── POST /email/test ──────────────────────────────────────────────────────────
router.post('/test', wrap(async (req, res) => {
  const { to } = req.body
  if (!to) return res.status(400).json({ success: false, error: 'to is required' })
  await sendEmail({ to, subject: '✅ Nexxus Email Test', html: welcomeTemplate({ name: 'Test User', role: 'student' }) })
  res.json({ success: true, message: 'Test email sent successfully' })
}))

// ── POST /email/send-password-reset ──────────────────────────────────────────
router.post('/send-password-reset', wrap(async (req, res) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ success: false, error: 'email is required' })

  // Fix: sanitize email before logging to prevent log injection
  console.log('[emailRoutes] Password reset requested')

  ensureAdminInit()
  let name = 'there'
  try {
    const userRecord = await getAuth().getUserByEmail(email)
    if (userRecord.displayName) name = userRecord.displayName
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      // Fix: don't log the raw email in warn — use sanitized version
      console.warn('[emailRoutes] getUserByEmail: user not found')
    } else {
      // Fix: sanitize err.code and err.message before logging
      console.warn(`[emailRoutes] getUserByEmail failed (${sanitizeLog(err.code || 'unknown')}): ${safeError(err)}`)
    }
  }

  const appUrl = process.env.APP_URL || 'http://localhost:3000'
  let firebaseLink
  try {
    firebaseLink = await getAuth().generatePasswordResetLink(email)
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      console.warn('[emailRoutes] generatePasswordResetLink: user not found')
      return res.json({ success: true, message: 'If that email exists, a reset link was sent.' })
    }
    throw err
  }

  const oobCode = new URL(firebaseLink).searchParams.get('oobCode')
  if (!oobCode) {
    throw new Error('Failed to generate a valid password reset link (missing oobCode).')
  }
  const resetLink = `${appUrl}/reset-password?oobCode=${encodeURIComponent(oobCode)}`

  await sendEmail({
    to:      email,
    subject: '🔐 Reset Your Nexxus Password',
    html:    passwordResetTemplate({ name, resetLink }),
  })

  res.json({ success: true })
}))

module.exports = router