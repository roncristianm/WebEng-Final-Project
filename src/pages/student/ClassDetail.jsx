import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { auth } from '../../config/firebase'
import { getClassById, leaveClass, getClassStudents } from '../../services/classService'
import { getClassAssignments, submitAssignment } from '../../services/assignmentService'
import { getClassAnnouncements } from '../../services/announcementService'
import { getStudentAssignments } from '../../services/assignmentService'
import Notification from '../../components/Notification'
import ConfirmDialog from '../../components/ConfirmDialog'
import '../../styles/StudentClassDetail.css'

const TABS = ['general', 'assignments', 'announcements', 'people']
const TAB_LABELS = {
  general:       'General',
  assignments:   'Assignments',
  announcements: 'Announcements',
  people:        'Members',
}

const TYPE_COLORS = {
  'Written Works': '#3b82f6',
  'Performance Task': '#10b981',
  'Quarterly Assessment': '#f59e0b'
}

/* ── SVG Icon set ── */
const Icons = {
  general: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  ),
  assignments: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
  announcements: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  ),
  materials: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
    </svg>
  ),
  people: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  back: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  ),
  teacher: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  copy: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
  ),
  check: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  leave: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  calendar: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  empty: (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
}

function formatDateTime(ts) {
  if (!ts) return ''
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}
function formatDate(ts) {
  if (!ts) return 'No deadline'
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function formatTime(ts) {
  if (!ts) return ''
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}
function isDeadlinePassed(dl) {
  if (!dl) return false
  const d = dl.toDate ? dl.toDate() : new Date(dl)
  return d < new Date()
}
function linkify(text = '') {
  return text.replace(/https?:\/\/[^\s<>"']+/gi, url =>
    `<a href="${url}" target="_blank" rel="noopener" class="scd-link">${url}</a>`
  )
}

function TypeChip({ type }) {
  const map = {
    announcement: { label: 'Announcement', cls: 'scd-chip--ann'  },
    assignment:   { label: 'Assignment',   cls: 'scd-chip--asgn' },
    material:     { label: 'Material',     cls: 'scd-chip--mat'  },
  }
  const { label, cls } = map[type] || {}
  return <span className={`scd-chip ${cls}`}>{label}</span>
}

function FeedCard({ title, meta, chip, overdue, onClick, children }) {
  return (
    <div
      className={`scd-feed-card ${overdue ? 'scd-feed-card--overdue' : ''} ${onClick ? 'scd-feed-card--clickable' : ''}`}
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : {}}
    >
      <div className="scd-feed-card-top">
        <div className="scd-feed-card-main">
          {chip && <TypeChip type={chip} />}
          <h3 className="scd-feed-title">{title}</h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {meta && <span className="scd-feed-meta">{meta}</span>}
          {onClick && (
            <span style={{ fontSize: 11, color: '#0038A8', fontWeight: 700, background: '#eff6ff', borderRadius: 6, padding: '2px 8px', whiteSpace: 'nowrap' }}>
              View →
            </span>
          )}
        </div>
      </div>
      {children && <div className="scd-feed-body">{children}</div>}
    </div>
  )
}

function UpcomingItem({ assignment }) {
  const overdue = isDeadlinePassed(assignment.deadline)
  return (
    <div className={`scd-up-item ${overdue ? 'scd-up-item--over' : ''}`}>
      <div className="scd-up-dot" />
      <div className="scd-up-content">
        <p className="scd-up-title">{assignment.title}</p>
        <p className="scd-up-date">{formatDate(assignment.deadline)} · {formatTime(assignment.deadline)}</p>
      </div>
    </div>
  )
}

/* ── Assignment Detail Modal ── */
function AssignmentModal({ assignment, submission, onClose, onSubmit, submitting, notification, onNotificationClose }) {
  const [score, setScore] = useState('')
  const isOverdue = isDeadlinePassed(assignment.deadline)
  const status = submission?.status || 'not_submitted'

  const getStatusBadge = (s) => {
    const badges = {
      done: { text: 'Submitted', color: '#10b981' },
      late: { text: 'Late', color: '#ef4444' },
      not_submitted: { text: 'Not Submitted', color: '#6b7280' }
    }
    const b = badges[s] || badges.not_submitted
    return (
      <span style={{ padding: '6px 16px', borderRadius: 12, fontSize: '0.85rem', fontWeight: 500, backgroundColor: `${b.color}20`, color: b.color }}>
        {b.text}
      </span>
    )
  }

  const typeColor = TYPE_COLORS[assignment.type] || '#6b7280'

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 2000 }}>
      <div className="modal-content modal-large" onClick={e => e.stopPropagation()} style={{ maxWidth: 680 }}>
        <div className="modal-header">
          <div>
            <h2 style={{ margin: 0, fontSize: '1.3rem' }}>{assignment.title}</h2>
            <p style={{ fontSize: '0.9rem', color: '#6b7280', marginTop: 4 }}>
              <span style={{ color: typeColor, fontWeight: 600 }}>{assignment.type}</span>
              {assignment.quarter && <> · {assignment.quarter}</>}
            </p>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* Info row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Deadline', value: `${formatDate(assignment.deadline)} ${formatTime(assignment.deadline)}` },
              { label: 'Possible Score', value: assignment.possibleScore },
              { label: 'Status', value: getStatusBadge(status) },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 14px' }}>
                <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#94a3b8' }}>{label}</p>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Description */}
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ margin: '0 0 10px', fontSize: '0.95rem', fontWeight: 700, color: '#374151' }}>Description</h3>
            <p style={{ color: '#4b5563', lineHeight: 1.7, whiteSpace: 'pre-wrap', background: '#f9fafb', padding: '14px 16px', borderRadius: 10, margin: 0, fontSize: 14 }}>
              {assignment.description || 'No description provided.'}
            </p>
          </div>

          {/* Sheet info */}
          <div style={{ marginBottom: 20, background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 9, padding: '10px 14px', fontSize: 13, color: '#0369a1' }}>
            📊 Your score will be recorded in the <strong>{assignment.quarter}</strong> sheet under <strong>{assignment.type}</strong>.
          </div>

          {/* Submit or already submitted */}
          {status === 'not_submitted' ? (
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>
                Your Score <span style={{ fontWeight: 400, color: '#6b7280' }}>(out of {assignment.possibleScore})</span>
              </label>
              <input
                type="number"
                value={score}
                onChange={e => setScore(e.target.value)}
                min="0"
                max={assignment.possibleScore}
                step="0.5"
                placeholder={`0 – ${assignment.possibleScore}`}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 9, border: '1.5px solid #d1d5db', fontSize: 15, marginBottom: 14, boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' }}
              />
              <div style={{ textAlign: 'right' }}>
                <button
                  onClick={() => onSubmit(assignment, score, setScore)}
                  disabled={submitting}
                  style={{ background: '#0038A8', color: '#fff', border: 'none', padding: '11px 28px', borderRadius: 9, fontSize: 15, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1, fontFamily: 'inherit' }}
                >
                  {submitting ? 'Submitting…' : '📤 Submit Assignment'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ padding: '14px 18px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10 }}>
              <p style={{ margin: 0, color: '#15803d', fontWeight: 700, fontSize: 15 }}>
                ✓ Submitted{status === 'late' ? ' (Late)' : ''}
                {submission?.score != null && ` — Score: ${submission.score}/${assignment.possibleScore}`}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Announcement Detail Modal ── */
function AnnouncementModal({ announcement, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 2000 }}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <div>
            <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{announcement.title}</h2>
            <p style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: 4 }}>
              {announcement.className} · {announcement.teacherName}
            </p>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
            Posted {formatDateTime(announcement.createdAt)}
          </p>
          <div style={{ background: '#f9fafb', borderRadius: 10, padding: '16px 18px', color: '#374151', lineHeight: 1.75, fontSize: 15, whiteSpace: 'pre-wrap' }}>
            {announcement.content}
          </div>
        </div>
        <div className="modal-footer" style={{ justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ background: '#0038A8', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ClassDetail() {
  const { classId } = useParams()
  const navigate    = useNavigate()

  const [classData,       setClassData]       = useState(null)
  const [assignments,     setAssignments]      = useState([])
  const [announcements,   setAnnouncements]    = useState([])
  const [students,        setStudents]         = useState([])
  const [submissionsMap,  setSubmissionsMap]   = useState({}) // assignmentId -> submission
  const [loading,         setLoading]          = useState(true)
  const [activeTab,       setActiveTab]        = useState('general')
  const [notification,    setNotification]     = useState(null)
  const [confirmDialog,   setConfirmDialog]    = useState(null)
  const [copied,          setCopied]           = useState(false)

  // Detail modals
  const [selectedAssignment,   setSelectedAssignment]   = useState(null)
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null)
  const [submitting,           setSubmitting]           = useState(false)

  useEffect(() => { loadClassData() }, [classId])

  const loadClassData = async () => {
    try {
      const [info, asgn, ann, studs] = await Promise.all([
        getClassById(classId),
        getClassAssignments(classId),
        getClassAnnouncements(classId),
        getClassStudents(classId),
      ])
      setClassData(info)
      setAssignments(asgn)
      setAnnouncements(ann)
      setStudents(studs)

      // Load student submissions
      if (auth.currentUser) {
        const classIds = [classId]
        const studentAsgns = await getStudentAssignments(auth.currentUser.uid, classIds)
        const map = {}
        studentAsgns.forEach(a => { map[a.id] = a.submission })
        setSubmissionsMap(map)
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(classData.classCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleLeaveClass = () => {
    setConfirmDialog({
      title: 'Leave Class',
      message: `Leave "${classData.name}"? You'll need a new code to rejoin.`,
      onConfirm: async () => {
        setConfirmDialog(null)
        const r = await leaveClass(classId, auth.currentUser.uid)
        if (r.success) {
          setNotification({ message: `Left "${classData.name}"`, type: 'success' })
          setTimeout(() => navigate('/dashboard/class'), 1200)
        } else {
          setNotification({ message: `Error: ${r.error}`, type: 'error' })
        }
      },
      onCancel: () => setConfirmDialog(null),
      confirmText: 'Leave', type: 'danger',
    })
  }

  const handleSubmitAssignment = async (assignment, score, setScore) => {
    if (!assignment) return
    const parsedScore = score !== '' ? parseFloat(score) : null
    if (parsedScore === null) {
      setNotification({ message: 'Please enter your score before submitting.', type: 'error' })
      return
    }
    if (parsedScore < 0 || parsedScore > assignment.possibleScore) {
      setNotification({ message: `Score must be between 0 and ${assignment.possibleScore}`, type: 'error' })
      return
    }
    setSubmitting(true)
    const result = await submitAssignment(assignment.id, auth.currentUser.uid, assignment.deadline, parsedScore)
    setSubmitting(false)
    if (result.success) {
      setNotification({
        message: result.status === 'late'
          ? `Submitted (Late) — Score ${parsedScore}/${assignment.possibleScore} recorded`
          : `Submitted! Score ${parsedScore}/${assignment.possibleScore} recorded`,
        type: result.status === 'late' ? 'warning' : 'success'
      })
      setSelectedAssignment(null)
      setScore('')
      loadClassData()
    } else {
      setNotification({ message: `Error: ${result.error}`, type: 'error' })
    }
  }

  const upcoming = assignments
    .filter(a => { if (!a.deadline) return false; const d = a.deadline.toDate ? a.deadline.toDate() : new Date(a.deadline); return d > new Date() })
    .sort((a, b) => { const da = a.deadline.toDate ? a.deadline.toDate() : new Date(a.deadline); const db = b.deadline.toDate ? b.deadline.toDate() : new Date(b.deadline); return da - db })

  const feed = [
    ...announcements.map(a => ({ ...a, _type: 'announcement', _date: a.createdAt })),
    ...assignments.map(a  => ({ ...a, _type: 'assignment',    _date: a.createdAt || a.deadline })),
  ].filter(i => i._date).sort((a, b) => {
    const ta = a._date.toMillis ? a._date.toMillis() : new Date(a._date).getTime()
    const tb = b._date.toMillis ? b._date.toMillis() : new Date(b._date).getTime()
    return tb - ta
  })

  if (loading) return <div className="scd-loading"><div className="scd-spinner" /><p>Loading class…</p></div>
  if (!classData) return <div className="scd-loading"><p>Class not found.</p><button className="scd-back-btn" onClick={() => navigate('/dashboard/class')}>← Back</button></div>

  return (
    <div className="scd-page">

      {/* ── BLUE HEADER ── */}
      <div className="scd-header">
        <button className="scd-back" onClick={() => navigate('/dashboard/class')}>
          {Icons.back} Classes
        </button>
        <div className="scd-header-inner">
          <div className="scd-header-info">
            <div className="scd-header-eyebrow">
              {classData.grade   && <span>Grade {classData.grade}</span>}
              {classData.section && <span>{classData.section}</span>}
            </div>
            <h1 className="scd-header-name">{classData.name}</h1>
            <p className="scd-header-teacher">{Icons.teacher} {classData.teacherName}</p>
          </div>
          <div className="scd-header-actions">
            <button className="scd-code-pill" onClick={handleCopyCode} title="Copy class code">
              {copied ? Icons.check : Icons.copy}
              <span className="scd-code-label">Code</span>
              <code className="scd-code-val">{classData.classCode}</code>
              <span className="scd-code-action">{copied ? 'Copied!' : 'Copy'}</span>
            </button>
            <button className="scd-leave-btn" onClick={handleLeaveClass}>
              {Icons.leave} <span>Leave</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── TAB BAR ── */}
      <div className="scd-tabbar">
        <div className="scd-tabs">
          {TABS.map(t => (
            <button key={t} className={`scd-tab ${activeTab === t ? 'scd-tab--active' : ''}`} onClick={() => setActiveTab(t)}>
              <span className="scd-tab-icon">{Icons[t]}</span>
              <span className="scd-tab-label">{TAB_LABELS[t]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="scd-body">
        <div className="scd-main">

          {/* GENERAL */}
          {activeTab === 'general' && (
            <div className="scd-section">
              <h2 className="scd-section-title">Recent Activity</h2>
              {feed.length === 0
                ? <div className="scd-empty">Nothing posted yet.</div>
                : feed.map(item => {
                    if (item._type === 'announcement') return (
                      <FeedCard
                        key={item.id} chip="announcement" title={item.title}
                        meta={formatDateTime(item.createdAt)}
                        onClick={() => setSelectedAnnouncement(item)}
                      >
                        <p>{item.content?.length > 120 ? item.content.slice(0, 120) + '…' : item.content}</p>
                      </FeedCard>
                    )
                    if (item._type === 'assignment') {
                      const sub = submissionsMap[item.id]
                      return (
                        <FeedCard
                          key={item.id} chip="assignment" title={item.title}
                          meta={`Due ${formatDate(item.deadline)}`}
                          overdue={isDeadlinePassed(item.deadline)}
                          onClick={() => setSelectedAssignment({ ...item, submission: sub })}
                        >
                          {item.description && <p>{item.description?.length > 100 ? item.description.slice(0, 100) + '…' : item.description}</p>}
                        </FeedCard>
                      )
                    }
                    return null
                  })
              }
            </div>
          )}

          {/* ASSIGNMENTS */}
          {activeTab === 'assignments' && (
            <div className="scd-section">
              <h2 className="scd-section-title">Assignments <span className="scd-count">{assignments.length}</span></h2>
              {assignments.length === 0
                ? <div className="scd-empty">No assignments yet.</div>
                : assignments.map(a => {
                    const sub = submissionsMap[a.id]
                    const status = sub?.status || 'not_submitted'
                    const statusColors = { done: '#10b981', late: '#ef4444', not_submitted: '#6b7280' }
                    const statusLabels = { done: 'Submitted', late: 'Late', not_submitted: 'Not Submitted' }
                    return (
                      <FeedCard
                        key={a.id} title={a.title}
                        meta={`Due ${formatDate(a.deadline)}`}
                        overdue={isDeadlinePassed(a.deadline)}
                        onClick={() => setSelectedAssignment({ ...a, submission: sub })}
                      >
                        <div className="scd-asgn-meta">
                          <span className="scd-badge">{a.type}</span>
                          <span className="scd-badge scd-badge--gray">{a.quarter}</span>
                          {a.possibleScore && <span className="scd-badge scd-badge--gray">{a.possibleScore} pts</span>}
                          <span style={{ padding: '2px 9px', borderRadius: 4, fontSize: '0.72rem', fontWeight: 700, background: `${statusColors[status]}20`, color: statusColors[status] }}>
                            {statusLabels[status]}
                          </span>
                        </div>
                        {a.description && <p className="scd-asgn-desc">{a.description?.length > 100 ? a.description.slice(0, 100) + '…' : a.description}</p>}
                        <p className="scd-asgn-time">
                          {formatDate(a.deadline)} at {formatTime(a.deadline)}
                          {isDeadlinePassed(a.deadline) && status === 'not_submitted' && <span className="scd-overdue-tag">Overdue</span>}
                        </p>
                      </FeedCard>
                    )
                  })
              }
            </div>
          )}

          {/* ANNOUNCEMENTS */}
          {activeTab === 'announcements' && (
            <div className="scd-section">
              <h2 className="scd-section-title">Announcements <span className="scd-count">{announcements.length}</span></h2>
              {announcements.length === 0
                ? <div className="scd-empty">No announcements yet.</div>
                : announcements.map(a => (
                    <FeedCard
                      key={a.id} title={a.title}
                      meta={formatDateTime(a.createdAt)}
                      onClick={() => setSelectedAnnouncement(a)}
                    >
                      <p>{a.content?.length > 120 ? a.content.slice(0, 120) + '…' : a.content}</p>
                      <p className="scd-by">By {a.teacherName}</p>
                    </FeedCard>
                  ))
              }
            </div>
          )}

          {/* PEOPLE */}
          {activeTab === 'people' && (
            <div className="scd-section">
              <h2 className="scd-section-title">Members <span className="scd-count">{students.length + 1}</span></h2>
              <div className="scd-people-group">
                <p className="scd-people-label">Teacher</p>
                <div className="scd-person scd-person--teacher">
                  <div className="scd-avatar">{classData.teacherName?.[0]?.toUpperCase()}</div>
                  <div>
                    <p className="scd-person-name">{classData.teacherName}</p>
                    <p className="scd-person-role">Teacher</p>
                  </div>
                </div>
              </div>
              <div className="scd-people-group">
                <p className="scd-people-label">Students — {students.length}</p>
                {students.length === 0
                  ? <div className="scd-empty" style={{ borderRadius: 0, border: 'none', borderTop: '1px dashed #e2e8f0' }}>No students yet.</div>
                  : [...students].sort((a, b) => (a.name || '').localeCompare(b.name || '')).map(s => (
                      <div key={s.id} className="scd-person">
                        <div className="scd-avatar scd-avatar--blue">{s.name?.[0]?.toUpperCase()}</div>
                        <p className="scd-person-name">{s.name}</p>
                      </div>
                    ))
                }
              </div>
            </div>
          )}
        </div>

        {/* SIDEBAR */}
        <aside className="scd-sidebar">
          <div className="scd-upcoming">
            <h3 className="scd-upcoming-title">{Icons.calendar} Upcoming</h3>
            {upcoming.length === 0 ? (
              <div className="scd-upcoming-empty">
                {Icons.empty}
                <p>No upcoming work</p>
              </div>
            ) : (
              <div className="scd-up-list">
                {upcoming.map(a => <UpcomingItem key={a.id} assignment={a} />)}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* ── Assignment Detail Modal ── */}
      {selectedAssignment && (
        <AssignmentModal
          assignment={selectedAssignment}
          submission={selectedAssignment.submission}
          onClose={() => setSelectedAssignment(null)}
          onSubmit={handleSubmitAssignment}
          submitting={submitting}
        />
      )}

      {/* ── Announcement Detail Modal ── */}
      {selectedAnnouncement && (
        <AnnouncementModal
          announcement={selectedAnnouncement}
          onClose={() => setSelectedAnnouncement(null)}
        />
      )}

      {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      {confirmDialog && (
        <ConfirmDialog
          title={confirmDialog.title} message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm} onCancel={confirmDialog.onCancel}
          confirmText={confirmDialog.confirmText} type={confirmDialog.type}
        />
      )}
    </div>
  )
}