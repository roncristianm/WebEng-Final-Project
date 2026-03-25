import { useState, useEffect } from 'react'
import { createClass } from '../../services/classService'
import CreateClassModal from '../../components/CreateClassModal'
import { useNavigate } from 'react-router-dom'
import { auth } from '../../config/firebase'
import { getTeacherClasses, deleteClass } from '../../services/classService'
import { getOverdueCount } from '../../services/overdueService'
import Notification from '../../components/Notification'
import ConfirmDialog from '../../components/ConfirmDialog'
import '../../styles/TeacherClass.css'

/* ── Same deterministic gradient system as student side ── */
const GRADIENTS = [
  ['#1e40af', '#3b82f6'],
  ['#065f46', '#10b981'],
  ['#7c2d12', '#f97316'],
  ['#581c87', '#a855f7'],
  ['#9f1239', '#f43f5e'],
  ['#0c4a6e', '#0ea5e9'],
  ['#713f12', '#eab308'],
  ['#134e4a', '#14b8a6'],
]

function getGradient(name = '') {
  const idx = name.split('').reduce((s, c) => s + c.charCodeAt(0), 0) % GRADIENTS.length
  return GRADIENTS[idx]
}

function getInitials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'
}

/* ── Class Card ─────────────────────────────────────────────────────────────── */
function ClassCard({ classItem, overdueCount, onClick, onDelete, onCopyCode }) {
  const [g1, g2] = getGradient(classItem.name)
  const initials = getInitials(classItem.name)
  const studentCount = classItem.studentCount || 0

  return (
    <div className="tc-card" onClick={onClick}>
      {/* Banner */}
      <div className="tc-card-banner" style={{ background: `linear-gradient(135deg, ${g1}, ${g2})` }}>
        <div className="tc-card-avatar">{initials}</div>
        <div className="tc-card-banner-overlay" />
        <div className="tc-card-circle tc-card-circle-1" style={{ background: g2 }} />
        <div className="tc-card-circle tc-card-circle-2" style={{ background: g1 }} />

        {/* Grade / Section badge top-right */}
        {(classItem.grade || classItem.section) && (
          <div className="tc-card-badge">
            {classItem.grade && `Grade ${classItem.grade}`}
            {classItem.grade && classItem.section && ' · '}
            {classItem.section && classItem.section}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="tc-card-body">
        <h3 className="tc-card-name">{classItem.name}</h3>

        {/* Stats row */}
        <div className="tc-card-stats">
          <div className="tc-stat">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <span>{studentCount} {studentCount === 1 ? 'student' : 'students'}</span>
          </div>

          {overdueCount > 0 && (
            <div className="tc-stat tc-stat--overdue">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>{overdueCount} overdue</span>
            </div>
          )}
        </div>

        {/* Class code row */}
        <button
          className="tc-code-row"
          onClick={e => { e.stopPropagation(); onCopyCode() }}
          title="Copy class code"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
          <span className="tc-code-label">Code:</span>
          <code className="tc-code-value">{classItem.classCode}</code>
          <span className="tc-code-copy">Copy</span>
        </button>

        {/* Footer */}
        <div className="tc-card-footer">
          <span className="tc-card-view">Manage Class →</span>
          <button
            className="tc-card-delete"
            onClick={e => { e.stopPropagation(); onDelete() }}
            title="Delete class"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Main Page ──────────────────────────────────────────────────────────────── */
function Class() {
  const navigate = useNavigate()
  const [classes,        setClasses]        = useState([])
  const [overdueCounts,  setOverdueCounts]  = useState({})
  const [loading,        setLoading]        = useState(true)
  const [notification,   setNotification]   = useState(null)
  const [confirmDialog,  setConfirmDialog]  = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating,       setCreating]       = useState(false)

  useEffect(() => { loadClasses() }, [])

  const loadClasses = async () => {
    if (!auth.currentUser) return
    const teacherClasses = await getTeacherClasses(auth.currentUser.uid)
    setClasses(teacherClasses)

    // Fetch overdue counts in parallel
    const counts = {}
    await Promise.all(
      teacherClasses.map(async c => {
        counts[c.id] = await getOverdueCount(c.id)
      })
    )
    setOverdueCounts(counts)
    setLoading(false)
  }

  const handleCreate = async ({ className, grade, section, sheetId }) => {
    if (!className.trim() || !grade.trim() || !section.trim() || !auth.currentUser) return
    setCreating(true)
    const result = await createClass(
      className.trim(), grade.trim(), section.trim(),
      auth.currentUser.uid,
      auth.currentUser.displayName || 'Teacher',
      sheetId || ''
    )
    if (result.success) {
      setShowCreateModal(false)
      await loadClasses()
      setNotification({ message: `Class "${className.trim()}" created! Code: ${result.classCode}`, type: 'success' })
    } else {
      setNotification({ message: `Failed: ${result.error}`, type: 'error' })
    }
    setCreating(false)
  }

  const handleDelete = (classId, className) => {
    setConfirmDialog({
      title: 'Delete Class',
      message: `Delete "${className}"? This cannot be undone — all students, assignments and materials will be permanently removed.`,
      onConfirm: async () => {
        setConfirmDialog(null)
        const result = await deleteClass(classId)
        if (result.success) {
          setNotification({ message: `"${className}" deleted`, type: 'success' })
          loadClasses()
        } else {
          setNotification({ message: `Error: ${result.error}`, type: 'error' })
        }
      },
      onCancel: () => setConfirmDialog(null),
      confirmText: 'Delete Class',
      type: 'danger',
    })
  }

  const handleCopyCode = (code, name) => {
    navigator.clipboard.writeText(code)
    setNotification({ message: `Code "${code}" copied!`, type: 'success' })
  }

  const totalStudents = classes.reduce((s, c) => s + (c.studentCount || 0), 0)
  const totalOverdue  = Object.values(overdueCounts).reduce((s, n) => s + n, 0)

  return (
    <div className="tc-page">

      {/* ── Header ── */}
      <div className="tc-header">
        <div className="tc-header-text">
          <h1 className="tc-header-title">My Classes</h1>
          <p className="tc-header-sub">Manage your classes and track student progress</p>
        </div>
        <button className="tc-create-btn" onClick={() => setShowCreateModal(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Create Class
        </button>
      </div>

      {/* ── Summary Pills (only when there are classes) ── */}
      {!loading && classes.length > 0 && (
        <div className="tc-summary">
          <div className="tc-pill">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
            {classes.length} {classes.length === 1 ? 'class' : 'classes'}
          </div>
          {totalOverdue > 0 && (
            <div className="tc-pill tc-pill--warn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {totalOverdue} overdue submissions
            </div>
          )}
        </div>
      )}

      {/* ── Content ── */}
      {loading ? (
        <div className="tc-loading">
          <div className="tc-spinner" />
          <p>Loading your classes…</p>
        </div>
      ) : classes.length === 0 ? (
        <div className="tc-empty">
          <div className="tc-empty-icon">🏫</div>
          <h2 className="tc-empty-title">No Classes Yet</h2>
          <p className="tc-empty-sub">Create your first class and share the code with your students to get started.</p>
          <button className="tc-create-btn tc-create-btn--lg" onClick={() => setShowCreateModal(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Create Your First Class
          </button>
        </div>
      ) : (
        <div className="tc-grid">
          {classes.map(c => (
            <ClassCard
              key={c.id}
              classItem={c}
              overdueCount={overdueCounts[c.id] ?? 0}
              onClick={() => navigate(`/teacher-dashboard/class/${c.id}`)}
              onDelete={() => handleDelete(c.id, c.name)}
              onCopyCode={() => handleCopyCode(c.classCode, c.name)}
            />
          ))}
        </div>
      )}

      {/* ── Modals ── */}
      <CreateClassModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreate}
        creating={creating}
      />

      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      {confirmDialog && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={confirmDialog.onCancel}
          confirmText={confirmDialog.confirmText}
          type={confirmDialog.type}
        />
      )}
    </div>
  )
}

export default Class