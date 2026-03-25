// functions/src/index.js
// ═══════════════════════════════════════════════════════════════════════════════
// Nexxus BHSA — Firebase Cloud Functions (v2, Node 18)
// Email notifications via Brevo SMTP + nodemailer
//
// Credentials are loaded from functions/.env (never committed to git)
//
// Functions exported:
//   HTTP (callable from frontend):
//     sendWelcomeEmail        — called after signup
//     sendPasswordResetEmail  — called from forgot-password flow
//
//   Firestore triggers (auto-fire, no frontend call needed):
//     onAnnouncementCreated   — fires when announcements/{id} is created
//     onAssignmentCreated     — fires when assignments/{id} is created
//     onMaterialCreated       — fires when materials/{id} is created
//
//   Scheduled:
//     deadlineReminderScheduler — runs every hour, emails students whose
//                                 assignments are due within 24h / 6h
// ═══════════════════════════════════════════════════════════════════════════════

const { initializeApp }     = require('firebase-admin/app')
const { onRequest }         = require('firebase-functions/v2/https')
const { onDocumentCreated } = require('firebase-functions/v2/firestore')
const { onSchedule }        = require('firebase-functions/v2/scheduler')
const { setGlobalOptions }  = require('firebase-functions/v2')

const { sendEmail, sendBulkEmails } = require('./mailer')
const {
  welcomeTemplate,
  announcementTemplate,
  newAssignmentTemplate,
  deadlineReminderTemplate,
  newMaterialTemplate,
  passwordResetTemplate,
} = require('./emailTemplates')
const {
  getClassStudents,
  getPendingDeadlines,
} = require('./firestoreHelpers')

// ── Init ──────────────────────────────────────────────────────────────────────
initializeApp()

// Asia-Southeast1 = Singapore, closest to Bataan/Manila
setGlobalOptions({ region: 'asia-southeast1', maxInstances: 10 })

// ── Helper: resolve APP_URL with fallback ─────────────────────────────────────
function appUrl() {
  return process.env.APP_URL || 'https://nexxus-65975.web.app'
}

// ── CORS helper for HTTP functions ────────────────────────────────────────────
function setCors(res) {
  res.set('Access-Control-Allow-Origin', '*')
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

// ═══════════════════════════════════════════════════════════════════════════════
// HTTP FUNCTION 1 — sendWelcomeEmail
// POST /sendWelcomeEmail
// Body: { to: string, name: string, role: 'student'|'teacher' }
// Call this from Signup.jsx right after the user is created.
// ═══════════════════════════════════════════════════════════════════════════════
exports.sendWelcomeEmail = onRequest(
  { cors: true },
  async (req, res) => {
    setCors(res)
    if (req.method === 'OPTIONS') return res.status(204).send('')
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

    const { to, name, role } = req.body
    if (!to || !name || !role) {
      return res.status(400).json({ success: false, error: 'to, name, and role are required' })
    }

    try {
      await sendEmail({
        to,
        subject: `Welcome to Nexxus, ${name}! 🎉`,
        html: welcomeTemplate({ name, role, appUrl: appUrl() }),
      })
      return res.json({ success: true })
    } catch (err) {
      console.error('[sendWelcomeEmail]', err.message)
      return res.status(500).json({ success: false, error: err.message })
    }
  }
)

// ═══════════════════════════════════════════════════════════════════════════════
// HTTP FUNCTION 2 — sendPasswordResetEmail
// POST /sendPasswordResetEmail
// Body: { to: string, name: string, resetLink: string }
// ═══════════════════════════════════════════════════════════════════════════════
exports.sendPasswordResetEmail = onRequest(
  { cors: true },
  async (req, res) => {
    setCors(res)
    if (req.method === 'OPTIONS') return res.status(204).send('')
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

    const { to, name, resetLink } = req.body
    if (!to || !name || !resetLink) {
      return res.status(400).json({ success: false, error: 'to, name, and resetLink are required' })
    }

    try {
      await sendEmail({
        to,
        subject: '🔐 Reset Your Nexxus Password',
        html: passwordResetTemplate({ name, resetLink }),
      })
      return res.json({ success: true })
    } catch (err) {
      console.error('[sendPasswordResetEmail]', err.message)
      return res.status(500).json({ success: false, error: err.message })
    }
  }
)

// ═══════════════════════════════════════════════════════════════════════════════
// FIRESTORE TRIGGER 1 — onAnnouncementCreated
// Fires automatically when announcements/{announcementId} is created
// ═══════════════════════════════════════════════════════════════════════════════
exports.onAnnouncementCreated = onDocumentCreated(
  'announcements/{announcementId}',
  async (event) => {
    const announcement = event.data.data()
    const { classId, className, teacherName, title, content, createdAt } = announcement

    if (!classId || !title) {
      console.warn('[onAnnouncementCreated] Missing classId or title — skipping')
      return
    }

    const students = await getClassStudents(classId)
    if (!students.length) {
      console.log(`[onAnnouncementCreated] No students in class ${classId}`)
      return
    }

    const postedAt = createdAt
      ? (createdAt.toDate ? createdAt.toDate() : new Date(createdAt))
          .toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
      : new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })

    const emails = students
      .filter((s) => !!s.email)
      .map((student) => ({
        to:      student.email,
        subject: `📢 New Announcement in ${className}: ${title}`,
        html:    announcementTemplate({
          studentName: student.name || 'Student',
          teacherName: teacherName  || 'Your Teacher',
          className,
          title,
          content,
          postedAt,
          appUrl: appUrl(),
        }),
      }))

    const { sent, failed } = await sendBulkEmails(emails)
    console.log(`[onAnnouncementCreated] "${title}" → ${sent} sent, ${failed} failed`)
  }
)

// ═══════════════════════════════════════════════════════════════════════════════
// FIRESTORE TRIGGER 2 — onAssignmentCreated
// Fires automatically when assignments/{assignmentId} is created
// ═══════════════════════════════════════════════════════════════════════════════
exports.onAssignmentCreated = onDocumentCreated(
  'assignments/{assignmentId}',
  async (event) => {
    const assignment = event.data.data()
    const { classId, className, teacherName, title, description, deadline, type, possibleScore } = assignment

    if (!classId || !title || !deadline) {
      console.warn('[onAssignmentCreated] Missing required fields — skipping')
      return
    }

    const students = await getClassStudents(classId)
    if (!students.length) return

    const emails = students
      .filter((s) => !!s.email)
      .map((student) => ({
        to:      student.email,
        subject: `📝 New Assignment in ${className}: ${title}`,
        html:    newAssignmentTemplate({
          studentName:  student.name || 'Student',
          teacherName:  teacherName  || 'Your Teacher',
          className,
          title,
          description,
          deadline,
          type,
          possibleScore,
          appUrl: appUrl(),
        }),
      }))

    const { sent, failed } = await sendBulkEmails(emails)
    console.log(`[onAssignmentCreated] "${title}" → ${sent} sent, ${failed} failed`)
  }
)

// ═══════════════════════════════════════════════════════════════════════════════
// FIRESTORE TRIGGER 3 — onMaterialCreated
// Fires automatically when materials/{materialId} is created
// ═══════════════════════════════════════════════════════════════════════════════
exports.onMaterialCreated = onDocumentCreated(
  'materials/{materialId}',
  async (event) => {
    const material = event.data.data()
    const { classId, className, teacherName, description, files, createdAt } = material

    if (!classId || !description) {
      console.warn('[onMaterialCreated] Missing classId or description — skipping')
      return
    }

    const students = await getClassStudents(classId)
    if (!students.length) return

    const fileCount = Array.isArray(files) ? files.length : 0
    const postedAt  = createdAt
      ? (createdAt.toDate ? createdAt.toDate() : new Date(createdAt))
          .toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
      : new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })

    const emails = students
      .filter((s) => !!s.email)
      .map((student) => ({
        to:      student.email,
        subject: `📎 New Material in ${className}`,
        html:    newMaterialTemplate({
          studentName: student.name  || 'Student',
          teacherName: teacherName   || 'Your Teacher',
          className,
          description,
          fileCount,
          postedAt,
          appUrl: appUrl(),
        }),
      }))

    const { sent, failed } = await sendBulkEmails(emails)
    console.log(`[onMaterialCreated] ${className} → ${sent} sent, ${failed} failed`)
  }
)

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEDULED FUNCTION — deadlineReminderScheduler
// Runs every hour. Sends reminders at ~24h and ~6h before deadline.
// ═══════════════════════════════════════════════════════════════════════════════
exports.deadlineReminderScheduler = onSchedule(
  { schedule: 'every 60 minutes', region: 'asia-southeast1' },
  async () => {
    console.log('[deadlineReminderScheduler] Running...')

    const pending = await getPendingDeadlines(25)

    // Only fire at exactly 24h and 12h before deadline
    const toRemind = pending.filter(
      (item) =>
        (item.hoursLeft >= 23 && item.hoursLeft <= 25) || // 1 day left (24h window)
        (item.hoursLeft >= 11 && item.hoursLeft <= 13)    // 12h left (12h window)
    )

    if (!toRemind.length) {
      console.log('[deadlineReminderScheduler] No reminders to send this run.')
      return
    }

    const emails = toRemind.map((item) => ({
      to:      item.studentEmail,
      subject: `⏰ Reminder: "${item.title}" is due in ${item.hoursLeft}h!`,
      html:    deadlineReminderTemplate({
        studentName: item.studentName,
        className:   item.className,
        title:       item.title,
        deadline:    item.deadline,
        type:        item.type,
        hoursLeft:   item.hoursLeft,
        appUrl:      appUrl(),
      }),
    }))

    const { sent, failed } = await sendBulkEmails(emails)
    console.log(`[deadlineReminderScheduler] ${sent} reminders sent, ${failed} failed`)
  }
)