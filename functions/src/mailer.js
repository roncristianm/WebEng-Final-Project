// functions/src/mailer.js
// Nodemailer transport using Brevo SMTP.
// Credentials are stored in Firebase Functions config:
//   firebase functions:config:set brevo.smtp_login="..." brevo.smtp_key="..." ...

const nodemailer    = require('nodemailer')
const { defineString } = require('firebase-functions/params')

// ── Runtime config params (set once via CLI, stored securely by Firebase) ─────
// These are read at cold-start from Firebase Functions environment config.
// See README section at bottom of this file for setup instructions.

let _transporter = null

function getTransporter() {
  if (_transporter) return _transporter

  // Firebase Functions v2: use process.env (set via firebase functions:secrets or .env)
  const smtpLogin = process.env.BREVO_SMTP_LOGIN
  const smtpKey   = process.env.BREVO_SMTP_KEY

  if (!smtpLogin || !smtpKey) {
    throw new Error(
      'Brevo SMTP credentials not configured. ' +
      'Run: firebase functions:secrets:set BREVO_SMTP_LOGIN BREVO_SMTP_KEY'
    )
  }

  _transporter = nodemailer.createTransport({
    host:   'smtp-relay.brevo.com',
    port:   587,
    secure: false,                // STARTTLS
    auth: {
      user: smtpLogin,
      pass: smtpKey,
    },
  })

  return _transporter
}

const BRAND_NAME = 'Nexxus · BHSA'

/**
 * Send a single email.
 * @param {{ to: string, subject: string, html: string }} options
 */
async function sendEmail({ to, subject, html }) {
  const fromEmail = process.env.BREVO_FROM_EMAIL || process.env.BREVO_SMTP_LOGIN
  const transporter = getTransporter()

  const info = await transporter.sendMail({
    from:    `"${BRAND_NAME}" <${fromEmail}>`,
    to,
    subject,
    html,
  })

  console.log(`[mailer] ✅ Sent → ${to} | subject: "${subject}" | msgId: ${info.messageId}`)
  return info
}

/**
 * Send the same email to multiple recipients (one email each, personalised).
 * Failures for individual recipients are logged but do not throw.
 *
 * @param {Array<{ to: string, subject: string, html: string }>} emails
 * @returns {Promise<{ sent: number, failed: number }>}
 */
async function sendBulkEmails(emails) {
  const results = await Promise.allSettled(emails.map((e) => sendEmail(e)))
  const sent   = results.filter((r) => r.status === 'fulfilled').length
  const failed = results.filter((r) => r.status === 'rejected').length

  if (failed > 0) {
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        console.error(`[mailer] ❌ Failed → ${emails[i].to}: ${r.reason.message}`)
      }
    })
  }

  console.log(`[mailer] Bulk send complete: ${sent} sent, ${failed} failed`)
  return { sent, failed }
}

module.exports = { sendEmail, sendBulkEmails }
