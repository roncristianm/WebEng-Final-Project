// sheets-backend/emailRoutes.js
const express = require('express')
// Initialise Firebase Admin via verificationService (same pattern it already uses)
const { initializeApp, cert, getApps } = require('firebase-admin/app')
const { getAuth }                       = require('firebase-admin/auth')
const fs   = require('fs')
const path = require('path')

function ensureAdminInit() {
  if (getApps().length) return
  let credential
  const localKey = path.join(__dirname, 'credentials.json')
  if (fs.existsSync(localKey)) {
    credential = cert(JSON.parse(fs.readFileSync(localKey, 'utf8')))
  } else if (process.env.GOOGLE_SHEETS_CREDENTIALS) {
    const raw = process.env.GOOGLE_SHEETS_CREDENTIALS
    try { credential = cert(JSON.parse(raw)) }
    catch { credential = cert(JSON.parse(raw.replace(/\\n/g, '\n'))) }
  } else if (process.env.GOOGLE_SHEETS_KEY_FILE) {
    credential = cert(JSON.parse(fs.readFileSync(process.env.GOOGLE_SHEETS_KEY_FILE, 'utf8')))
  } else {
    throw new Error('No Firebase Admin credentials found.')
  }
  initializeApp({ credential })
}
const router  = express.Router()
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

// Wrap async handlers so errors are caught cleanly
const wrap = (fn) => (req, res) =>
  Promise.resolve(fn(req, res)).catch((err) => {
    console.error('[emailRoutes]', err.message)
    res.status(500).json({ success: false, error: err.message })
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
// Body: { uid, email, name }
// Called right after signup — generates a token and sends the branded email.
router.post('/send-verification', wrap(async (req, res) => {
  const { uid, email, name } = req.body
  if (!uid || !email || !name)
    return res.status(400).json({ success: false, error: 'uid, email, name are required' })

  const token      = await createVerificationToken(uid, email)
  const appUrl     = process.env.APP_URL || 'http://localhost:3000'
  const verifyLink = `${appUrl}/verify?token=${token}`

  await sendEmail({
    to:      email,
    subject: '✉️ Verify your Nexxus email address',
    html:    emailVerificationTemplate({ name, verifyLink }),
  })
  res.json({ success: true })
}))

// ── POST /email/resend-verification ──────────────────────────────────────────
// Body: { uid, email, name }
// Called when user clicks "Resend verification email".
router.post('/resend-verification', wrap(async (req, res) => {
  const { uid, email, name } = req.body
  if (!uid || !email || !name)
    return res.status(400).json({ success: false, error: 'uid, email, name are required' })

  const token      = await refreshVerificationToken(uid, email)
  const appUrl     = process.env.APP_URL || 'http://localhost:3000'
  const verifyLink = `${appUrl}/verify?token=${token}`

  await sendEmail({
    to:      email,
    subject: '✉️ Verify your Nexxus email address',
    html:    emailVerificationTemplate({ name, verifyLink }),
  })
  res.json({ success: true })
}))

// ── GET /email/verify?token=xxx ───────────────────────────────────────────────
// The link in the email points here. Verifies the token then redirects
// back to the React app with a result param that VerifyEmail.jsx reads.
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
  res.json({ success: true, message: `Test email sent to ${to}` })
}))

// ── POST /email/send-password-reset ──────────────────────────────────────────
// Body: { email }
// Generates a Firebase password reset link via Admin SDK,
// then sends it through your custom branded email template.
router.post('/send-password-reset', wrap(async (req, res) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ success: false, error: 'email is required' })

  // 1. Look up the user's display name via Admin SDK
  ensureAdminInit()
  let name = 'there'
  try {
    const userRecord = await getAuth().getUserByEmail(email)
    if (userRecord.displayName) name = userRecord.displayName
  } catch (err) {
    // If user not found, Firebase Admin throws — treat as success (don't reveal existence)
    if (err.code === 'auth/user-not-found') {
      return res.json({ success: true, message: 'If that email exists, a reset link was sent.' })
    }
    throw err
  }

  // 2. Generate the reset link via Admin SDK
  // Generate the Firebase reset link, extract the oobCode,
  // then build a link to OUR page so user never sees Firebase's UI
  const appUrl      = process.env.APP_URL || 'http://localhost:3000'
  const firebaseLink = await getAuth().generatePasswordResetLink(email)
  const oobCode      = new URL(firebaseLink).searchParams.get('oobCode')
  const resetLink    = `${appUrl}/reset-password?oobCode=${oobCode}`

  // 3. Send branded email
  await sendEmail({
    to:      email,
    subject: '🔐 Reset Your Nexxus Password',
    html:    passwordResetTemplate({ name, resetLink }),
  })

  res.json({ success: true })
}))

module.exports = router