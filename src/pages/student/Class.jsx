import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '../../config/firebase'
import { getStudentClasses, leaveClass } from '../../services/classService'
import Notification from '../../components/Notification'
import ConfirmDialog from '../../components/ConfirmDialog'
import '../../styles/Studentclass.css'

/* Deterministic gradient per class based on name */
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

/* ── Join Class Modal ──────────────────────────────────────────────────────── */
function JoinModal({ onClose, onJoin, joining }) {
  const [code, setCode] = useState('')
  return (
    <div className="sc-overlay" onClick={onClose}>
      <div className="sc-modal" onClick={e => e.stopPropagation()}>
        <button className="sc-modal-close" onClick={onClose}>×</button>
        <div className="sc-modal-icon">🎓</div>
        <h2 className="sc-modal-title">Join a Class</h2>
        <p className="sc-modal-sub">Enter the class code given by your teacher</p>
        <input
          className="sc-modal-input"
          type="text"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="e.g. AB12CD"
          autoFocus
          maxLength={8}
          onKeyDown={e => e.key === 'Enter' && code.trim() && onJoin(code.trim())}
        />
        <div className="sc-modal-actions">
          <button className="sc-btn-ghost" onClick={onClose} disabled={joining}>Cancel</button>
          <button className="sc-btn-primary" onClick={() => onJoin(code.trim())} disabled={joining || !code.trim()}>
            {joining ? 'Joining…' : 'Join Class'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Class Card ────────────────────────────────────────────────────────────── */
function ClassCard({ classItem, onClick, onLeave }) {
  const [g1, g2] = getGradient(classItem.name)
  const initials = getInitials(classItem.name)
  const studentCount = classItem.studentCount || 0

  return (
    <div className="sc-card" onClick={onClick}>
      {/* Banner */}
      <div className="sc-card-banner" style={{ background: `linear-gradient(135deg, ${g1}, ${g2})` }}>
        <div className="sc-card-avatar">{initials}</div>
        <div className="sc-card-banner-overlay" />
        {/* Decorative circles */}
        <div className="sc-card-circle sc-card-circle-1" style={{ background: g2 }} />
        <div className="sc-card-circle sc-card-circle-2" style={{ background: g1 }} />
      </div>

      {/* Body */}
      <div className="sc-card-body">
        <h3 className="sc-card-name">{classItem.name}</h3>

        <div className="sc-card-meta">
          <span className="sc-card-meta-item">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            {classItem.teacherName || 'Teacher'}
          </span>
          <span className="sc-card-meta-item">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            {studentCount} {studentCount === 1 ? 'student' : 'students'}
          </span>
        </div>

        <div className="sc-card-footer">
          <span className="sc-card-view">View Class →</span>
          <button
            className="sc-card-leave"
            onClick={e => { e.stopPropagation(); onLeave() }}
            title="Leave class"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Leave
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Main Page ─────────────────────────────────────────────────────────────── */
function Class() {
  const navigate = useNavigate()
  const [classes,       setClasses]       = useState([])
  const [loading,       setLoading]       = useState(true)
  const [notification,  setNotification]  = useState(null)
  const [confirmDialog, setConfirmDialog] = useState(null)
  const [showJoin,      setShowJoin]      = useState(false)
  const [joining,       setJoining]       = useState(false)

  useEffect(() => { loadClasses() }, [])

  const loadClasses = async () => {
    if (auth.currentUser) {
      const data = await getStudentClasses(auth.currentUser.uid)
      setClasses(data)
      setLoading(false)
    }
  }

  const handleJoin = async (code) => {
    setJoining(true)
    try {
      const { joinClass } = await import('../../services/classService')
      const result = await joinClass(
        code,
        auth.currentUser.uid,
        auth.currentUser.displayName || '',
        auth.currentUser.email || ''
      )
      if (result.success) {
        setNotification({ message: 'Successfully joined class!', type: 'success' })
        setShowJoin(false)
        loadClasses()
      } else {
        setNotification({ message: `Failed to join: ${result.error}`, type: 'error' })
      }
    } catch {
      setNotification({ message: 'Something went wrong. Try again.', type: 'error' })
    }
    setJoining(false)
  }

  const handleLeave = (classId, className) => {
    setConfirmDialog({
      title: 'Leave Class',
      message: `Leave "${className}"? You'll need a new code to rejoin.`,
      onConfirm: async () => {
        setConfirmDialog(null)
        const result = await leaveClass(classId, auth.currentUser.uid)
        if (result.success) {
          setNotification({ message: `Left "${className}"`, type: 'success' })
          loadClasses()
        } else {
          setNotification({ message: `Error: ${result.error}`, type: 'error' })
        }
      },
      onCancel: () => setConfirmDialog(null),
      confirmText: 'Leave',
      type: 'danger',
    })
  }

  return (
    <div className="sc-page">

      {/* ── Header ── */}
      <div className="sc-header">
        <div className="sc-header-text">
          <h1 className="sc-header-title">My Classes</h1>
          <p className="sc-header-sub">View and manage your enrolled classes</p>
        </div>
        <button className="sc-join-btn" onClick={() => setShowJoin(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Join Class
        </button>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="sc-loading">
          <div className="sc-spinner" />
          <p>Loading your classes…</p>
        </div>
      ) : classes.length === 0 ? (
        <div className="sc-empty">
          <div className="sc-empty-icon">📚</div>
          <h2 className="sc-empty-title">No Classes Yet</h2>
          <p className="sc-empty-sub">Join a class using a code from your teacher to get started.</p>
          <button className="sc-join-btn sc-join-btn--lg" onClick={() => setShowJoin(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Join Your First Class
          </button>
        </div>
      ) : (
        <>
          <p className="sc-count">{classes.length} {classes.length === 1 ? 'class' : 'classes'} enrolled</p>
          <div className="sc-grid">
            {classes.map(c => (
              <ClassCard
                key={c.id}
                classItem={c}
                onClick={() => navigate(`/dashboard/class/${c.id}`)}
                onLeave={() => handleLeave(c.id, c.name)}
              />
            ))}
          </div>
        </>
      )}

      {/* ── Modals / Dialogs ── */}
      {showJoin && (
        <JoinModal
          onClose={() => setShowJoin(false)}
          onJoin={handleJoin}
          joining={joining}
        />
      )}

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