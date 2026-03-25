import { useState, useEffect } from 'react'
import { auth } from '../../config/firebase'
import { getStudentClasses } from '../../services/classService'
import { getStudentAssignments, submitAssignment } from '../../services/assignmentService'
import Notification from '../../components/Notification'
import '../../styles/Assignment.css'

const TYPE_COLORS = {
  'Written Works':        '#3b82f6',
  'Performance Task':     '#10b981',
  'Quarterly Assessment': '#f59e0b',
}

const TYPE_CONFIGS = {
  'Written Works': {
    bg:       'linear-gradient(135deg, #eff6ff, #dbeafe)',
    border:   '#bfdbfe',
    head:     '#1e40af',
    badgeBg:  'rgba(59,130,246,.1)',
    pct:      30,
  },
  'Performance Task': {
    bg:       'linear-gradient(135deg, #ecfdf5, #d1fae5)',
    border:   '#a7f3d0',
    head:     '#166534',
    badgeBg:  'rgba(16,185,129,.1)',
    pct:      50,
  },
  'Quarterly Assessment': {
    bg:       'linear-gradient(135deg, #fef3c7, #fde68a)',
    border:   '#fcd34d',
    head:     '#d97706',
    badgeBg:  'rgba(245,158,11,.1)',
    pct:      20,
  },
}

const TABS = [
  { key: 'upcoming',  label: 'Upcoming'  },
  { key: 'past-due',  label: 'Overdue'   },
  { key: 'completed', label: 'Completed' },
]

function isOverdue(deadline) {
  return deadline && new Date(deadline) < new Date()
}

function formatDate(ds) {
  if (!ds) return 'N/A'
  return new Date(ds).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatTime(ds) {
  if (!ds) return ''
  return new Date(ds).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

/* ── Status badge ── */
function StatusBadge({ status }) {
  const map = {
    done:          { text: 'Submitted',     color: '#10b981' },
    late:          { text: 'Late',          color: '#ef4444' },
    not_submitted: { text: 'Not Submitted', color: '#6b7280' },
  }
  const { text, color } = map[status] || map.not_submitted
  return (
    <span style={{
      display: 'inline-block',
      padding: '4px 12px',
      borderRadius: 12,
      fontSize: '0.78rem',
      fontWeight: 600,
      background: `${color}20`,
      color,
    }}>
      {text}
    </span>
  )
}

/* ── Detail / Submit Modal ── */
function AssignmentModal({ assignment, onClose, onSubmit, submitting, notification, onNotificationClose }) {
  const [score, setScore] = useState('')
  const status  = assignment.submission?.status || 'not_submitted'
  const submitted = status === 'done' || status === 'late'
  const typeColor = TYPE_COLORS[assignment.type] || '#6b7280'

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{ zIndex: 2000, alignItems: 'center' }}
    >
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: 560,
          width: '92%',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 20,
          overflow: 'hidden',
        }}
      >
        {/* ── Header ── */}
        <div style={{
          padding: '24px 28px 18px',
          borderBottom: '1px solid #f1f5f9',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <h2 style={{ margin: '0 0 6px', fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                {assignment.title}
              </h2>
              <p style={{ margin: 0, fontSize: 13, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span>{assignment.className}</span>
                <span style={{ color: '#cbd5e1' }}>·</span>
                <span style={{ color: typeColor, fontWeight: 600 }}>{assignment.type}</span>
                <span style={{ color: '#cbd5e1' }}>·</span>
                <span>{assignment.quarter}</span>
              </p>
            </div>
            <button
              className="modal-close"
              onClick={onClose}
              style={{ flexShrink: 0, marginTop: 2 }}
            >×</button>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Info grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            {[
              { label: 'Deadline',       value: `${formatDate(assignment.deadline)} ${formatTime(assignment.deadline)}` },
              { label: 'Possible Score', value: `${assignment.possibleScore} pts` },
              { label: 'Status',         value: <StatusBadge status={status} /> },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px', border: '1px solid #e2e8f0' }}>
                <p style={{ margin: '0 0 5px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#94a3b8' }}>{label}</p>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Description */}
          <div>
            <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#94a3b8' }}>Description</p>
            <p style={{
              margin: 0,
              background: '#f9fafb',
              borderRadius: 10,
              padding: '14px 16px',
              fontSize: 14,
              color: '#374151',
              lineHeight: 1.75,
              whiteSpace: 'pre-wrap',
              minHeight: 60,
              border: '1px solid #f1f5f9',
            }}>
              {assignment.description || 'No description provided.'}
            </p>
          </div>

          {/* Sheet info */}
          <div style={{
            background: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: 10,
            padding: '12px 16px',
            fontSize: 13,
            color: '#0369a1',
            lineHeight: 1.6,
          }}>
            📊 Your score will be recorded in the{' '}
            <strong>ENGLISH {assignment.quarter}</strong> sheet under{' '}
            <strong style={{ color: typeColor }}>{assignment.type}</strong>.
          </div>

          {/* Submit section OR already submitted */}
          {!submitted ? (
            <div>
              <label style={{ display: 'block', marginBottom: 10, fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
                Your Score{' '}
                <span style={{ fontWeight: 400, color: '#6b7280' }}>(out of {assignment.possibleScore})</span>
              </label>
              <input
                type="number"
                value={score}
                onChange={e => setScore(e.target.value)}
                min="0"
                max={assignment.possibleScore}
                step="0.5"
                placeholder={`0 – ${assignment.possibleScore}`}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: 10,
                  border: '1.5px solid #e2e8f0',
                  fontSize: 16,
                  fontFamily: 'inherit',
                  color: '#0f172a',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                onFocus={e => { e.target.style.borderColor = '#0038A8'; e.target.style.boxShadow = '0 0 0 3px rgba(0,56,168,0.1)' }}
                onBlur={e  => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none' }}
              />
              {isOverdue(assignment.deadline) && (
                <p style={{ margin: '8px 0 0', fontSize: 12, color: '#ef4444', fontWeight: 600 }}>
                  ⚠️ Deadline has passed — submission will be marked late.
                </p>
              )}
            </div>
          ) : (
            <div style={{
              padding: '16px 20px',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: 12,
            }}>
              <p style={{ margin: 0, color: '#15803d', fontWeight: 700, fontSize: 15 }}>
                ✓ {status === 'late' ? 'Submitted (Late)' : 'Submitted'}
                {assignment.submission?.score != null && (
                  <> &mdash; Score:{' '}
                    <span style={{ fontSize: 20 }}>{assignment.submission.score}</span>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>/{assignment.possibleScore}</span>
                  </>
                )}
              </p>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        {!submitted && (
          <div style={{
            padding: '16px 28px 22px',
            borderTop: '1px solid #f1f5f9',
            flexShrink: 0,
            display: 'flex',
            justifyContent: 'flex-end',
          }}>
            <button
              onClick={() => onSubmit(assignment, score, () => setScore(''))}
              disabled={submitting}
              style={{
                background: '#0038A8',
                color: '#fff',
                border: 'none',
                padding: '14px 32px',
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 700,
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.7 : 1,
                fontFamily: 'inherit',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 4px 14px rgba(0,56,168,0.35)',
                transition: 'opacity 0.15s, transform 0.12s',
              }}
            >
              {submitting ? 'Submitting…' : '📤 Submit Assignment'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Assignment card ── */
function AssignmentCard({ assignment, onClick }) {
  const status  = assignment.submission?.status || 'not_submitted'
  const score   = assignment.submission?.score
  const overdue = isOverdue(assignment.deadline)
  const color   = TYPE_COLORS[assignment.type] || '#6b7280'

  return (
    <div
      className="assignment-card"
      onClick={onClick}
      style={{ borderLeft: `4px solid ${color}`, cursor: 'pointer' }}
    >
      <div className="assignment-card-header">
        <div style={{ minWidth: 0, flex: 1 }}>
          <h4 style={{ margin: '0 0 3px', fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {assignment.title}
          </h4>
          <span style={{ fontSize: 11, color: '#9ca3af' }}>
            {assignment.quarter}
            {assignment.itemNumber != null ? ` · Item ${assignment.itemNumber}` : ''}
            {' · '}{assignment.className}
          </span>
        </div>
      </div>

      <div className="assignment-card-body">
        {/* Deadline */}
        <div className="assignment-date" style={{ fontSize: 12, marginBottom: 10 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <span style={{ color: overdue && status === 'not_submitted' ? '#ef4444' : '#64748b' }}>
            {formatDate(assignment.deadline)} · {formatTime(assignment.deadline)}
          </span>
        </div>

        {/* Status + score row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
          <StatusBadge status={status} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {(status === 'done' || status === 'late') && score != null && (
              <span style={{ fontSize: 13, fontWeight: 700, color: '#059669' }}>
                {score} / {assignment.possibleScore}
              </span>
            )}
            {status === 'not_submitted' && overdue && (
              <span style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', background: '#fef2f2', borderRadius: 4, padding: '2px 7px' }}>
                Overdue
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Column ── */
function AssignmentColumn({ type, assignments, onSelect }) {
  const color  = TYPE_COLORS[type]
  const config = TYPE_CONFIGS[type]

  const sorted = [...assignments].sort((a, b) => {
    const an = a.itemNumber ?? Infinity
    const bn = b.itemNumber ?? Infinity
    if (an !== bn) return an - bn
    const at = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime()
    const bt = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime()
    return at - bt
  })

  return (
    <div style={{
      background: config.bg,
      padding: '1.25rem',
      borderRadius: 16,
      border: `2px solid ${config.border}`,
      display: 'flex',
      flexDirection: 'column',
      gap: '0.85rem',
    }}>
      {/* Column header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: config.head }}>
          {type} <span style={{ fontWeight: 500, opacity: 0.7 }}>({config.pct}%)</span>
        </h3>
        <span style={{
          background: config.badgeBg,
          color: config.head,
          padding: '2px 10px',
          borderRadius: 20,
          fontSize: '0.8rem',
          fontWeight: 600,
          marginLeft: 'auto',
          flexShrink: 0,
        }}>
          {sorted.length}
        </span>
      </div>

      {sorted.length === 0 ? (
        <div style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b' }}>
          <p style={{ fontSize: '0.9rem', margin: 0 }}>No {type} yet</p>
        </div>
      ) : (
        sorted.map(a => (
          <AssignmentCard key={a.id} assignment={a} onClick={() => onSelect(a)} />
        ))
      )}
    </div>
  )
}

/* ── Main Page ── */
function Assignment() {
  const [assignments,        setAssignments]        = useState([])
  const [loading,            setLoading]            = useState(true)
  const [notification,       setNotification]       = useState(null)
  const [showDetailModal,    setShowDetailModal]    = useState(false)
  const [selectedAssignment, setSelectedAssignment] = useState(null)
  const [activeTab,          setActiveTab]          = useState('upcoming')
  const [submitting,         setSubmitting]         = useState(false)

  useEffect(() => { loadAssignments() }, [])

  const loadAssignments = async () => {
    if (auth.currentUser) {
      const studentClasses = await getStudentClasses(auth.currentUser.uid)
      const classIds = studentClasses.map(c => c.id)
      const studentAssignments = await getStudentAssignments(auth.currentUser.uid, classIds)
      setAssignments(studentAssignments)
      setLoading(false)
    }
  }

  const handleSubmit = async (assignment, score, clearScore) => {
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
    const result = await submitAssignment(
      assignment.id, auth.currentUser.uid, assignment.deadline, parsedScore
    )
    setSubmitting(false)
    if (result.success) {
      setNotification({
        message: result.status === 'late'
          ? `Submitted (Late) — Score ${parsedScore}/${assignment.possibleScore} recorded`
          : `Submitted! Score ${parsedScore}/${assignment.possibleScore} recorded`,
        type: result.status === 'late' ? 'warning' : 'success',
      })
      setShowDetailModal(false)
      clearScore()
      loadAssignments()
    } else {
      setNotification({ message: `Error: ${result.error}`, type: 'error' })
    }
  }

  const openModal = (a) => {
    setSelectedAssignment(a)
    setShowDetailModal(true)
  }

  /* Tab filtering */
  const getTabAssignments = (tab) => {
    switch (tab) {
      case 'upcoming':
        return assignments.filter(a =>
          !isOverdue(a.deadline) && (a.submission?.status || 'not_submitted') === 'not_submitted'
        )
      case 'past-due':
        return assignments.filter(a =>
          isOverdue(a.deadline) && (a.submission?.status || 'not_submitted') === 'not_submitted'
        )
      case 'completed':
        return assignments.filter(a => ['done', 'late'].includes(a.submission?.status))
      default:
        return assignments
    }
  }

  const tabCounts = {
    upcoming:  getTabAssignments('upcoming').length,
    'past-due': getTabAssignments('past-due').length,
    completed: getTabAssignments('completed').length,
  }

  const filtered = getTabAssignments(activeTab)
  const byType   = (type) => filtered.filter(a => a.type === type)

  return (
    <div className="page-container">
      {/* Header */}
      <div className="section-header">
        <div>
          <h2>Assignments</h2>
          <p className="page-subtitle">Track and submit your assignments</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-container">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            className={`tab-btn ${activeTab === key ? 'tab-btn--active' : ''}`}
            onClick={() => setActiveTab(key)}
          >
            {label}
            <span style={{
              marginLeft: 7,
              background: activeTab === key ? 'rgba(255,255,255,0.25)' : '#e5e7eb',
              color: activeTab === key ? '#fff' : '#6b7280',
              borderRadius: 20,
              padding: '1px 8px',
              fontSize: '0.78rem',
              fontWeight: 700,
            }}>
              {tabCounts[key]}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="loading-container"><p>Loading assignments…</p></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state-container">
          <div className="empty-state-card">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: 12, color: '#94a3b8' }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            <h3>
              {activeTab === 'upcoming'  ? 'No Upcoming Assignments'  :
               activeTab === 'past-due'  ? 'No Overdue Assignments'   :
               'No Completed Assignments'}
            </h3>
            <p>
              {activeTab === 'upcoming'  ? 'Check back later for new assignments.' :
               activeTab === 'past-due'  ? "You're all caught up!"                :
               'Submit assignments to see them here.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="assignment-columns">
          {['Written Works', 'Performance Task', 'Quarterly Assessment'].map(type => (
            <AssignmentColumn
              key={type}
              type={type}
              assignments={byType(type)}
              onSelect={openModal}
            />
          ))}
        </div>
      )}

      {/* Detail / Submit Modal */}
      {showDetailModal && selectedAssignment && (
        <AssignmentModal
          assignment={selectedAssignment}
          onClose={() => setShowDetailModal(false)}
          onSubmit={handleSubmit}
          submitting={submitting}
        />
      )}

      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  )
}

export default Assignment