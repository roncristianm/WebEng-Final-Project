import { useState, useEffect } from 'react'
import { auth } from '../../config/firebase'
import { getStudentClasses } from '../../services/classService'
import { getStudentAssignments } from '../../services/assignmentService'
import '../../styles/Dashboard.css'
import '../../styles/Assignment.css'

const TYPE_COLORS = {
  'Written Works': '#3b82f6',
  'Performance Task': '#10b981',
  'Quarterly Assessment': '#f59e0b',
}

const TYPE_CONFIGS = {
  'Written Works': {
    bg: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
    border: '#bfdbfe',
    head: '#1e40af',
    badgeBg: 'rgba(59,130,246,.1)',
    pct: 30,
  },
  'Performance Task': {
    bg: 'linear-gradient(135deg, #ecfdf5, #d1fae5)',
    border: '#a7f3d0',
    head: '#166534',
    badgeBg: 'rgba(16,185,129,.1)',
    pct: 50,
  },
  'Quarterly Assessment': {
    bg: 'linear-gradient(135deg, #fef3c7, #fde68a)',
    border: '#fcd34d',
    head: '#d97706',
    badgeBg: 'rgba(245,158,11,.1)',
    pct: 20,
  },
}

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4']

function formatDate(ds) {
  if (!ds) return 'N/A'
  return new Date(ds).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function formatTime(ds) {
  if (!ds) return ''
  return new Date(ds).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit',
  })
}

function isOverdue(deadline) {
  return deadline && new Date(deadline) < new Date()
}

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
      padding: '3px 10px',
      borderRadius: 10,
      fontSize: '0.75rem',
      fontWeight: 600,
      background: `${color}20`,
      color,
    }}>
      {text}
    </span>
  )
}

/* ── Detail Modal ── */
function AssignmentDetailModal({ assignment, onClose }) {
  const status = assignment.submission?.status || 'not_submitted'
  const score  = assignment.submission?.score
  const typeColor = TYPE_COLORS[assignment.type] || '#6b7280'

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 2000 }}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{assignment.title}</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>
              <span style={{ color: typeColor, fontWeight: 600 }}>{assignment.type}</span>
              {assignment.quarter && <> · {assignment.quarter}</>}
              {assignment.className && <> · {assignment.className}</>}
            </p>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'Deadline',       value: `${formatDate(assignment.deadline)} ${formatTime(assignment.deadline)}` },
              { label: 'Possible Score', value: `${assignment.possibleScore ?? '—'} pts` },
              { label: 'Status',         value: <StatusBadge status={status} /> },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: '#f8fafc', borderRadius: 9, padding: '11px 14px', border: '1px solid #e2e8f0' }}>
                <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#94a3b8' }}>{label}</p>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Score result */}
          {(status === 'done' || status === 'late') && score != null ? (
            <div style={{ marginBottom: 18, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '14px 18px' }}>
              <p style={{ margin: 0, color: '#15803d', fontWeight: 700, fontSize: 15 }}>
                ✓ {status === 'late' ? 'Submitted (Late)' : 'Submitted'}
                {' '}&mdash; Score:&nbsp;
                <span style={{ fontSize: 20 }}>{score}</span>
                <span style={{ fontSize: 14, fontWeight: 500 }}>/{assignment.possibleScore ?? '—'}</span>
              </p>
            </div>
          ) : status === 'not_submitted' ? (
            <div style={{ marginBottom: 18, background: '#f9fafb', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 18px' }}>
              <p style={{ margin: 0, color: '#6b7280', fontWeight: 600, fontSize: 14 }}>
                {isOverdue(assignment.deadline)
                  ? '⚠️ Deadline has passed — this assignment is overdue.'
                  : '📝 You have not submitted this assignment yet.'}
              </p>
            </div>
          ) : null}

          {/* Description */}
          {assignment.description && (
            <div>
              <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#94a3b8' }}>Description</p>
              <p style={{ margin: 0, background: '#f9fafb', borderRadius: 9, padding: '13px 15px', fontSize: 14, color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {assignment.description}
              </p>
            </div>
          )}
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

/* ── Column ── */
function AssignmentColumn({ type, assignments, onSelect }) {
  const color  = TYPE_COLORS[type]
  const config = TYPE_CONFIGS[type]

  return (
    <div style={{ background: config.bg, padding: '1.25rem', borderRadius: 16, border: `2px solid ${config.border}`, display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      {/* Column header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: config.head }}>
          {type} <span style={{ fontWeight: 500, opacity: 0.75 }}>({config.pct}%)</span>
        </h3>
        <span style={{ background: config.badgeBg, color: config.head, padding: '2px 10px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600, marginLeft: 'auto', flexShrink: 0 }}>
          {assignments.length}
        </span>
      </div>

      {assignments.length === 0 ? (
        <div style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b' }}>
          <p style={{ fontSize: '0.9rem', margin: 0 }}>No {type} yet</p>
        </div>
      ) : (
        assignments.map(a => {
          const status   = a.submission?.status || 'not_submitted'
          const score    = a.submission?.score
          const overdue  = isOverdue(a.deadline)

          return (
            <div
              key={a.id}
              className="assignment-card"
              onClick={() => onSelect(a)}
              style={{ borderLeft: `4px solid ${color}`, cursor: 'pointer' }}
            >
              <div className="assignment-card-header">
                <div style={{ minWidth: 0, flex: 1 }}>
                  <h4 style={{ margin: '0 0 4px', fontSize: '0.95rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.title}
                  </h4>
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>
                    {a.quarter}{a.itemNumber != null ? ` · Item ${a.itemNumber}` : ''} · {a.className}
                  </span>
                </div>
              </div>

              <div className="assignment-card-body">
                {/* Date */}
                <div className="assignment-date" style={{ fontSize: 12, marginBottom: 8 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  <span style={{ color: overdue && status === 'not_submitted' ? '#ef4444' : 'inherit' }}>
                    {formatDate(a.deadline)}
                  </span>
                </div>

                {/* Status & score */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                  <StatusBadge status={status} />
                  {(status === 'done' || status === 'late') && score != null && (
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#059669' }}>
                      {score} / {a.possibleScore ?? '—'}
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
          )
        })
      )}
    </div>
  )
}

/* ── Main Page ── */
function Grade() {
  const [classes,           setClasses]           = useState([])
  const [selectedClassId,   setSelectedClassId]   = useState('')
  const [selectedQuarter,   setSelectedQuarter]   = useState('Q1')
  const [assignments,       setAssignments]        = useState([])
  const [loading,           setLoading]           = useState(true)
  const [loadingAsgn,       setLoadingAsgn]       = useState(false)
  const [selectedAssignment,setSelectedAssignment]= useState(null)

  /* Load classes on mount */
  useEffect(() => {
    const loadClasses = async () => {
      if (!auth.currentUser) return
      const enrolled = await getStudentClasses(auth.currentUser.uid)
      setClasses(enrolled)
      setLoading(false)
    }
    loadClasses()
  }, [])

  /* Load assignments when class or quarter changes */
  useEffect(() => {
    if (!selectedClassId || !auth.currentUser) {
      setAssignments([])
      return
    }
    const load = async () => {
      setLoadingAsgn(true)
      const all = await getStudentAssignments(auth.currentUser.uid, [selectedClassId])
      setAssignments(all.filter(a => a.quarter === selectedQuarter))
      setLoadingAsgn(false)
    }
    load()
  }, [selectedClassId, selectedQuarter])

  const byType = (type) =>
    assignments
      .filter(a => a.type === type)
      .sort((a, b) => {
        // Primary: itemNumber (assigned at creation time per type per class)
        const an = a.itemNumber ?? Infinity
        const bn = b.itemNumber ?? Infinity
        if (an !== bn) return an - bn
        // Fallback: createdAt timestamp
        const at = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime()
        const bt = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime()
        return at - bt
      })

  const selectedClass = classes.find(c => c.id === selectedClassId)

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-container"><p>Loading grades…</p></div>
      </div>
    )
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="section-header">
        <div>
          <h2>Grades</h2>
          <p className="page-subtitle">
            {selectedClass
              ? `${selectedClass.name} · ${selectedQuarter} · Written Works (30%) | Performance Tasks (50%) | Quarterly Assessment (20%)`
              : 'Select a class and quarter to view your scores'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ marginBottom: '2rem', padding: '1.25rem', background: 'linear-gradient(135deg,#f8fafc,#f1f5f9)', borderRadius: 12, border: '1px solid #e2e8f0', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        {/* Class selector */}
        <div style={{ flex: '1 1 220px', minWidth: 200 }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.88rem', color: '#374151' }}>
            Class
          </label>
          <select
            value={selectedClassId}
            onChange={e => setSelectedClassId(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: 9, fontSize: '0.9rem', fontFamily: 'inherit', cursor: 'pointer', background: '#fff', color: selectedClassId ? '#0f172a' : '#9ca3af', outline: 'none' }}
          >
            <option value="">Select a class…</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Quarter selector */}
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.88rem', color: '#374151' }}>
            Quarter
          </label>
          <div style={{ display: 'flex', gap: 6 }}>
            {QUARTERS.map(q => (
              <button
                key={q}
                onClick={() => setSelectedQuarter(q)}
                style={{
                  padding: '9px 18px',
                  border: `2px solid ${selectedQuarter === q ? '#0038A8' : '#e2e8f0'}`,
                  borderRadius: 9,
                  background: selectedQuarter === q ? '#0038A8' : '#fff',
                  color: selectedQuarter === q ? '#fff' : '#475569',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: '0.85rem',
                  transition: 'all 0.15s',
                }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      {!selectedClassId ? (
        <div className="empty-state-container">
          <div className="empty-state-card">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: 12, color: '#94a3b8' }}>
              <line x1="18" y1="20" x2="18" y2="10"/>
              <line x1="12" y1="20" x2="12" y2="4"/>
              <line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
            <h3>Select a Class</h3>
            <p>Choose a class from the dropdown above to view your scores per assignment type.</p>
          </div>
        </div>
      ) : loadingAsgn ? (
        <div className="loading-container"><p>Loading assignments…</p></div>
      ) : (
        <div className="assignment-columns">
          {['Written Works', 'Performance Task', 'Quarterly Assessment'].map(type => (
            <AssignmentColumn
              key={type}
              type={type}
              assignments={byType(type)}
              onSelect={setSelectedAssignment}
            />
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedAssignment && (
        <AssignmentDetailModal
          assignment={selectedAssignment}
          onClose={() => setSelectedAssignment(null)}
        />
      )}
    </div>
  )
}

export default Grade