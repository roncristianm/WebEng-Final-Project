// sheets-backend/emailRoutes.js
const express = require('express')
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
  getAdminUserData,
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

  const token = await createVerificationToken(uid, email)
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
// Body: { uid, email, name }
// Called when user clicks "Resend verification email".
router.post('/resend-verification', wrap(async (req, res) => {
  const { uid, email, name } = req.body
  if (!uid || !email || !name)
    return res.status(400).json({ success: false, error: 'uid, email, name are required' })

  const token = await refreshVerificationToken(uid, email)
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
// The link in the email points here. Verifies the token then redirects
// back to the React app with a result param that VerifyEmail.jsx reads.
router.get('/verify', wrap(async (req, res) => {
  console.log('[verify] token:', req.query.token)
  const { token } = req.query
  const appUrl    = process.env.APP_URL || 'http://localhost:3000'

  if (!token) {
    return res.redirect(`${appUrl}/verify?error=missing_token`)
  }

  const result = await verifyToken(token)

  if (result.success) {
    // Send welcome email now that user is verified
    try {
      const userData = await getAdminUserData(result.uid)
      if (userData) {
        await sendEmail({
          to: result.email,
          subject: `Welcome to Nexxus, ${userData.name}! 🎉`,
          html: welcomeTemplate({ name: userData.name, role: userData.role }),
        })
      }
    } catch (emailErr) {
      console.error('[verify] Welcome email failed:', emailErr.message)
    }

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

module.exports = router