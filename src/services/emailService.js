// src/services/emailService.js
// Calls the email endpoints on sheets-backend via the Vite proxy (/sheets-api)
// Never throws — email failures are logged but won't crash the app.

const EMAIL_API = '/sheets-api/email'

async function post(path, body) {
  try {
    const res  = await fetch(`${EMAIL_API}${path}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Email request failed')
    return { success: true, ...data }
  } catch (err) {
    console.error(`[emailService] ${path}:`, err.message)
    return { success: false, error: err.message }
  }
}

// ── Welcome ───────────────────────────────────────────────────────────────────
// Call after signup. { to, name, role }
export async function sendWelcomeEmail({ to, name, role }) {
  return post('/welcome', { to, name, role })
}

// ── Announcement notification ─────────────────────────────────────────────────
// to + studentName can be arrays for a whole class.
// { to, studentName, teacherName, className, title, content }
export async function sendAnnouncementNotification({ to, studentName, teacherName, className, title, content }) {
  return post('/announcement', { to, studentName, teacherName, className, title, content })
}

// ── New assignment notification ───────────────────────────────────────────────
// to + studentName can be arrays.
// { to, studentName, teacherName, className, title, description, deadline, type, possibleScore }
export async function sendNewAssignmentNotification({ to, studentName, teacherName, className, title, description, deadline, type, possibleScore }) {
  return post('/new-assignment', { to, studentName, teacherName, className, title, description, deadline, type, possibleScore })
}

// ── Deadline reminder ─────────────────────────────────────────────────────────
// to + studentName can be arrays.
// { to, studentName, className, title, deadline, type }
export async function sendDeadlineReminder({ to, studentName, className, title, deadline, type }) {
  return post('/deadline-reminder', { to, studentName, className, title, deadline, type })
}

// ── New material notification ─────────────────────────────────────────────────
// to + studentName can be arrays.
// { to, studentName, teacherName, className, description, fileCount }
export async function sendNewMaterialNotification({ to, studentName, teacherName, className, description, fileCount }) {
  return post('/new-material', { to, studentName, teacherName, className, description, fileCount })
}

// ── Password reset ────────────────────────────────────────────────────────────
// { to, name, resetLink }
export async function sendPasswordResetEmail({ to, name, resetLink }) {
  return post('/password-reset', { to, name, resetLink })
}
