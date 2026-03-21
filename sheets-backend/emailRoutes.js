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
} = require('./emailService')

// Wrap async handlers so errors are caught cleanly
const wrap = (fn) => (req, res) =>
  Promise.resolve(fn(req, res)).catch((err) => {
    console.error('[emailRoutes]', err.message)
    res.status(500).json({ success: false, error: err.message })
  })

// ── POST /email/welcome ───────────────────────────────────────────────────────
// Body: { to, name, role }
router.post('/welcome', wrap(async (req, res) => {
  const { to, name, role } = req.body
  if (!to || !name || !role)
    return res.status(400).json({ success: false, error: 'to, name, role are required' })

  await sendEmail({
    to,
    subject: `Welcome to Nexxus, ${name}! 🎉`,
    html: welcomeTemplate({ name, role }),
  })
  res.json({ success: true })
}))

// ── POST /email/announcement ──────────────────────────────────────────────────
// Body: { to, studentName, teacherName, className, title, content }
// to + studentName can be arrays for bulk sending to a whole class
router.post('/announcement', wrap(async (req, res) => {
  const { to, studentName, teacherName, className, title, content } = req.body
  if (!to || !teacherName || !className || !title || !content)
    return res.status(400).json({ success: false, error: 'to, teacherName, className, title, content are required' })

  const recipients = Array.isArray(to) ? to : [to]
  const names      = Array.isArray(studentName) ? studentName : recipients.map(() => studentName || 'Student')
  const postedAt   = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })

  const emails = recipients.map((email, i) => ({
    to:      email,
    subject: `📢 New Announcement in ${className}: ${title}`,
    html:    announcementTemplate({ studentName: names[i], teacherName, className, title, content, postedAt }),
  }))

  const { sent, failed } = await sendBulkEmails(emails)
  res.json({ success: true, sent, failed })
}))

// ── POST /email/new-assignment ────────────────────────────────────────────────
// Body: { to, studentName, teacherName, className, title, description, deadline, type, possibleScore }
// to + studentName can be arrays
router.post('/new-assignment', wrap(async (req, res) => {
  const { to, studentName, teacherName, className, title, description, deadline, type, possibleScore } = req.body
  if (!to || !teacherName || !className || !title || !deadline || !type)
    return res.status(400).json({ success: false, error: 'to, teacherName, className, title, deadline, type are required' })

  const recipients = Array.isArray(to) ? to : [to]
  const names      = Array.isArray(studentName) ? studentName : recipients.map(() => studentName || 'Student')

  const emails = recipients.map((email, i) => ({
    to:      email,
    subject: `📝 New Assignment in ${className}: ${title}`,
    html:    newAssignmentTemplate({ studentName: names[i], teacherName, className, title, description, deadline, type, possibleScore }),
  }))

  const { sent, failed } = await sendBulkEmails(emails)
  res.json({ success: true, sent, failed })
}))

// ── POST /email/deadline-reminder ─────────────────────────────────────────────
// Body: { to, studentName, className, title, deadline, type, hoursLeft }
// to + studentName can be arrays
router.post('/deadline-reminder', wrap(async (req, res) => {
  const { to, studentName, className, title, deadline, type, hoursLeft } = req.body
  if (!to || !className || !title || !deadline || !type)
    return res.status(400).json({ success: false, error: 'to, className, title, deadline, type are required' })

  const recipients = Array.isArray(to) ? to : [to]
  const names      = Array.isArray(studentName) ? studentName : recipients.map(() => studentName || 'Student')
  const hours      = hoursLeft ?? Math.round((new Date(deadline) - new Date()) / 36e5)

  const emails = recipients.map((email, i) => ({
    to:      email,
    subject: `⏰ Reminder: "${title}" is due in ${hours}h!`,
    html:    deadlineReminderTemplate({ studentName: names[i], className, title, deadline, type, hoursLeft: hours }),
  }))

  const { sent, failed } = await sendBulkEmails(emails)
  res.json({ success: true, sent, failed })
}))

// ── POST /email/new-material ──────────────────────────────────────────────────
// Body: { to, studentName, teacherName, className, description, fileCount }
// to + studentName can be arrays
router.post('/new-material', wrap(async (req, res) => {
  const { to, studentName, teacherName, className, description, fileCount } = req.body
  if (!to || !teacherName || !className || !description)
    return res.status(400).json({ success: false, error: 'to, teacherName, className, description are required' })

  const recipients = Array.isArray(to) ? to : [to]
  const names      = Array.isArray(studentName) ? studentName : recipients.map(() => studentName || 'Student')
  const postedAt   = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })

  const emails = recipients.map((email, i) => ({
    to:      email,
    subject: `📎 New Material in ${className}`,
    html:    newMaterialTemplate({ studentName: names[i], teacherName, className, description, fileCount, postedAt }),
  }))

  const { sent, failed } = await sendBulkEmails(emails)
  res.json({ success: true, sent, failed })
}))

// ── POST /email/password-reset ────────────────────────────────────────────────
// Body: { to, name, resetLink }
router.post('/password-reset', wrap(async (req, res) => {
  const { to, name, resetLink } = req.body
  if (!to || !name || !resetLink)
    return res.status(400).json({ success: false, error: 'to, name, resetLink are required' })

  await sendEmail({
    to,
    subject: '🔐 Reset Your Nexxus Password',
    html: passwordResetTemplate({ name, resetLink }),
  })
  res.json({ success: true })
}))

// ── POST /email/test ──────────────────────────────────────────────────────────
// Quick check that Brevo credentials work
// Body: { to }
router.post('/test', wrap(async (req, res) => {
  const { to } = req.body
  if (!to) return res.status(400).json({ success: false, error: 'to is required' })

  await sendEmail({
    to,
    subject: '✅ Nexxus Email Test',
    html: welcomeTemplate({ name: 'Test User', role: 'student' }),
  })
  res.json({ success: true, message: `Test email sent to ${to}` })
}))

module.exports = router
