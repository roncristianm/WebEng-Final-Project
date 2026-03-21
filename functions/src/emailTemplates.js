// functions/src/emailTemplates.js
// All HTML email templates for Nexxus BHSA

const BRAND_COLOR  = '#0038A8'
const ACCENT_COLOR = '#FCD116'   // Philippine flag yellow — nice accent
const BRAND_NAME   = 'Nexxus · BHSA'
const SCHOOL_NAME  = 'Bataan High School For The Arts'

// ── Base layout wrapper ───────────────────────────────────────────────────────
function baseTemplate({ title, preheader, body }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #f0f4fb;
      font-family: 'Segoe UI', Roboto, Arial, sans-serif;
      color: #1f2937;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper  { max-width: 600px; margin: 0 auto; padding: 32px 16px 48px; }
    .card     { background: #fff; border-radius: 16px; overflow: hidden;
                box-shadow: 0 4px 24px rgba(0,56,168,.10); }

    /* Header */
    .header   { background: ${BRAND_COLOR}; padding: 36px 40px 30px; text-align: center; }
    .header-accent { width: 100%; height: 4px; background: ${ACCENT_COLOR}; }
    .header h1 { color: #fff; font-size: 24px; font-weight: 700; letter-spacing: -.3px; margin-bottom: 6px; }
    .header p  { color: rgba(255,255,255,.80); font-size: 13px; }

    /* Body */
    .body     { padding: 40px 40px 32px; }
    .body h2  { font-size: 22px; color: ${BRAND_COLOR}; margin-bottom: 16px; }
    .body p   { font-size: 15px; line-height: 1.75; margin-bottom: 14px; color: #374151; }

    /* Info box */
    .info-box {
      background: #eff4ff;
      border-left: 4px solid ${BRAND_COLOR};
      border-radius: 0 10px 10px 0;
      padding: 16px 20px;
      margin: 20px 0;
      font-size: 14px;
      color: #1e3a5f;
      line-height: 1.7;
    }
    .info-box .info-title { font-weight: 700; font-size: 15px; margin-bottom: 8px; color: ${BRAND_COLOR}; }

    /* Badge */
    .badge {
      display: inline-block;
      padding: 3px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      background: ${BRAND_COLOR}18;
      color: ${BRAND_COLOR};
      margin-right: 4px;
    }
    .badge-warning { background: #fef3c730; color: #d97706; }
    .badge-danger  { background: #fee2e2; color: #dc2626; }

    /* CTA button */
    .btn-wrap  { text-align: center; margin: 28px 0 8px; }
    .btn {
      display: inline-block;
      padding: 14px 32px;
      background: ${BRAND_COLOR};
      color: #fff !important;
      border-radius: 10px;
      font-weight: 700;
      font-size: 15px;
      text-decoration: none;
      letter-spacing: .2px;
    }

    /* Divider */
    .divider { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }

    /* Footer */
    .footer { padding: 20px 40px 30px; text-align: center; font-size: 12px; color: #9ca3af; line-height: 1.7; }
    .footer a { color: #6b7280; text-decoration: none; }

    /* Meta line */
    .meta { font-size: 13px; color: #9ca3af; }

    @media (max-width: 600px) {
      .body, .footer, .header { padding-left: 24px; padding-right: 24px; }
    }
  </style>
</head>
<body>
  <!-- Preheader (hidden preview text in inbox) -->
  <span style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}&nbsp;&zwnj;&nbsp;</span>

  <div class="wrapper">
    <div class="card">
      <div class="header-accent"></div>
      <div class="header">
        <h1>${BRAND_NAME}</h1>
        <p>${SCHOOL_NAME}</p>
      </div>
      <div class="body">${body}</div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} ${SCHOOL_NAME} · Nexxus Learning Platform</p>
        <p style="margin-top:4px;">This is an automated message — please do not reply directly to this email.</p>
      </div>
    </div>
  </div>
</body>
</html>`
}

// ── Welcome ───────────────────────────────────────────────────────────────────
function welcomeTemplate({ name, role, appUrl }) {
  const isTeacher = role === 'teacher'
  const dashboard = isTeacher ? `${appUrl}/teacher-dashboard` : `${appUrl}/dashboard`
  const roleLabel = isTeacher ? 'Teacher' : 'Student'
  const nextStep  = isTeacher
    ? 'Create your first class, post assignments, and keep your students on track.'
    : 'Ask your teacher for a class code, join your class, and start tracking your assignments.'

  return baseTemplate({
    title: `Welcome to Nexxus, ${name}!`,
    preheader: `Your ${roleLabel} account on Nexxus is ready. Get started today!`,
    body: `
      <h2>Welcome aboard, ${name}! 🎉</h2>
      <p>Your <strong>${roleLabel}</strong> account on the Nexxus learning platform has been created successfully.</p>
      <div class="info-box">
        <div class="info-title">Your Account</div>
        Name: <strong>${name}</strong><br/>
        Role: <span class="badge">${roleLabel}</span>
      </div>
      <p>${nextStep}</p>
      <div class="btn-wrap">
        <a class="btn" href="${dashboard}">Go to Dashboard →</a>
      </div>
      <hr class="divider"/>
      <p class="meta">If you did not create this account, please ignore this email — no action is needed.</p>
    `,
  })
}

// ── Announcement ──────────────────────────────────────────────────────────────
function announcementTemplate({ studentName, teacherName, className, title, content, postedAt, appUrl }) {
  return baseTemplate({
    title: `New Announcement: ${title}`,
    preheader: `${teacherName} posted a new announcement in ${className}.`,
    body: `
      <h2>📢 New Announcement</h2>
      <p>Hi <strong>${studentName}</strong>,</p>
      <p>Your teacher <strong>${teacherName}</strong> has posted a new announcement in <strong>${className}</strong>.</p>
      <div class="info-box">
        <div class="info-title">${title}</div>
        ${content}
      </div>
      <p class="meta">Posted on ${postedAt || new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</p>
      <div class="btn-wrap">
        <a class="btn" href="${appUrl}/dashboard">View in Nexxus →</a>
      </div>
    `,
  })
}

// ── New Assignment ────────────────────────────────────────────────────────────
function newAssignmentTemplate({ studentName, teacherName, className, title, description, deadline, type, possibleScore, appUrl }) {
  const deadlineDate = new Date(deadline)
  return baseTemplate({
    title: `New Assignment: ${title}`,
    preheader: `${teacherName} posted a new ${type} in ${className}. Due ${deadlineDate.toLocaleDateString()}.`,
    body: `
      <h2>📝 New Assignment Posted</h2>
      <p>Hi <strong>${studentName}</strong>,</p>
      <p><strong>${teacherName}</strong> has posted a new assignment in <strong>${className}</strong>.</p>
      <div class="info-box">
        <div class="info-title">${title}</div>
        ${description ? `<p style="margin: 6px 0 10px;">${description}</p>` : ''}
        <span class="badge">${type}</span><br/>
        <span style="margin-top:8px;display:inline-block;">
          📅 Due: <strong>${deadlineDate.toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}</strong>
        </span><br/>
        ${possibleScore ? `⭐ Possible Score: <strong>${possibleScore} pts</strong>` : ''}
      </div>
      <div class="btn-wrap">
        <a class="btn" href="${appUrl}/dashboard/assignment">View Assignment →</a>
      </div>
    `,
  })
}

// ── Deadline Reminder ─────────────────────────────────────────────────────────
function deadlineReminderTemplate({ studentName, className, title, deadline, type, hoursLeft, appUrl }) {
  const isUrgent  = hoursLeft <= 24
  const emoji     = hoursLeft <= 6 ? '🚨' : hoursLeft <= 24 ? '⏰' : '📌'
  const urgency   = isUrgent ? 'Due Very Soon!' : 'Upcoming Deadline'
  const badgeClass = isUrgent ? 'badge-danger' : 'badge-warning'

  return baseTemplate({
    title: `${emoji} ${urgency} — ${title}`,
    preheader: `Your assignment "${title}" is due in ${hoursLeft} hour${hoursLeft !== 1 ? 's' : ''}. Submit now!`,
    body: `
      <h2>${emoji} ${urgency}</h2>
      <p>Hi <strong>${studentName}</strong>,</p>
      <p>Just a reminder — your assignment in <strong>${className}</strong> needs to be submitted soon!</p>
      <div class="info-box">
        <div class="info-title">${title}</div>
        <span class="badge">${type}</span>
        <span class="badge ${badgeClass}">⏱ ${hoursLeft}h remaining</span><br/>
        <span style="margin-top:8px;display:inline-block;">
          📅 Deadline: <strong>${new Date(deadline).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}</strong>
        </span>
      </div>
      <div class="btn-wrap">
        <a class="btn" href="${appUrl}/dashboard/assignment">Submit Now →</a>
      </div>
      <p class="meta">
        ${hoursLeft <= 6
          ? '⚠️ Less than 6 hours left — don\'t miss the deadline!'
          : 'Make sure to submit before the deadline to avoid late penalties.'}
      </p>
    `,
  })
}

// ── New Material ──────────────────────────────────────────────────────────────
function newMaterialTemplate({ studentName, teacherName, className, description, fileCount, postedAt, appUrl }) {
  return baseTemplate({
    title: `New Material in ${className}`,
    preheader: `${teacherName} uploaded ${fileCount ? `${fileCount} new file${fileCount > 1 ? 's' : ''}` : 'new materials'} to ${className}.`,
    body: `
      <h2>📎 New Learning Material</h2>
      <p>Hi <strong>${studentName}</strong>,</p>
      <p><strong>${teacherName}</strong> has uploaded new learning materials to <strong>${className}</strong>.</p>
      <div class="info-box">
        <div class="info-title">Material Details</div>
        ${description}
        ${fileCount ? `<br/><span style="margin-top:8px;display:inline-block;">📁 <strong>${fileCount} file${fileCount > 1 ? 's' : ''}</strong> attached</span>` : ''}
      </div>
      <p class="meta">Uploaded on ${postedAt || new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</p>
      <div class="btn-wrap">
        <a class="btn" href="${appUrl}/dashboard">View Materials →</a>
      </div>
    `,
  })
}

// ── Password Reset ────────────────────────────────────────────────────────────
function passwordResetTemplate({ name, resetLink }) {
  return baseTemplate({
    title: 'Reset Your Nexxus Password',
    preheader: 'A password reset was requested for your Nexxus account. Link expires in 1 hour.',
    body: `
      <h2>🔐 Reset Your Password</h2>
      <p>Hi <strong>${name}</strong>,</p>
      <p>We received a request to reset the password for your Nexxus account. Click the button below to set a new password.</p>
      <div class="btn-wrap">
        <a class="btn" href="${resetLink}">Reset My Password →</a>
      </div>
      <hr class="divider"/>
      <p class="meta">
        ⏱ This link expires in <strong>1 hour</strong>.<br/>
        If you did not request a password reset, you can safely ignore this email — your password will not change.
      </p>
      <p class="meta" style="margin-top:8px;">
        If the button doesn't work, copy and paste this link into your browser:<br/>
        <a href="${resetLink}" style="color:${BRAND_COLOR};word-break:break-all;">${resetLink}</a>
      </p>
    `,
  })
}

module.exports = {
  welcomeTemplate,
  announcementTemplate,
  newAssignmentTemplate,
  deadlineReminderTemplate,
  newMaterialTemplate,
  passwordResetTemplate,
}
