import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '../../config/firebase'
import { joinClass, getStudentClasses } from '../../services/classService'
import { getStudentAssignments } from '../../services/assignmentService'
import { getStudentAnnouncements } from '../../services/announcementService'
import Notification from '../../components/Notification'
import '../../styles/Studentdashboard.css'

export default function Dashboard() {
  const navigate = useNavigate()
  const userName = auth.currentUser?.displayName || 'Student'

  const [showJoinModal,  setShowJoinModal]  = useState(false)
  const [classCode,      setClassCode]      = useState('')
  const [classes,        setClasses]        = useState([])
  const [pendingCount,   setPendingCount]   = useState(0)
  const [completedCount, setCompletedCount] = useState(0)
  const [overdueCount,   setOverdueCount]   = useState(0)
  const [announcements,  setAnnouncements]  = useState([])
  const [loading,        setLoading]        = useState(true)
  const [joining,        setJoining]        = useState(false)
  const [notification,   setNotification]   = useState(null)

  useEffect(() => { loadClasses() }, [])

  const loadClasses = async () => {
    if (!auth.currentUser) return
    setLoading(true)
    try {
      const studentClasses = await getStudentClasses(auth.currentUser.uid)
      setClasses(studentClasses)

      const classIds    = studentClasses.map(c => c.id)
      const assignments = await getStudentAssignments(auth.currentUser.uid, classIds)
      const now         = new Date()

      setPendingCount(assignments.filter(a => {
        if (!a.submission || a.submission.status === 'not_submitted')
          return new Date(a.deadline) > now
        return false
      }).length)

      setCompletedCount(assignments.filter(a => a.submission?.status === 'done').length)

      setOverdueCount(assignments.filter(a => {
        if (a.submission?.status === 'not_submitted') return new Date(a.deadline) < now
        return a.submission?.status === 'late'
      }).length)

      const anns = await getStudentAnnouncements(auth.currentUser.uid)
      setAnnouncements(anns)
    } catch (err) {
      console.error('Failed to load student dashboard data:', err)
      setNotification({ message: 'Failed to load dashboard data.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const formatDateTime = (timestamp) => {
    if (!timestamp) return ''
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const handleJoinClass  = () => setShowJoinModal(true)
  const handleCloseModal = () => { setShowJoinModal(false); setClassCode('') }
  const handleClassClick = (id) => navigate(`/dashboard/class/${id}`)

  const handleJoinSubmit = async (e) => {
    e.preventDefault()
    if (!classCode.trim() || !auth.currentUser) return
    setJoining(true)

    let userGender = 'Male'
    try {
      const { getDoc, doc } = await import('firebase/firestore')
      const { db }          = await import('../../config/firebase')
      const snap = await getDoc(doc(db, 'users', auth.currentUser.uid))
      if (snap.exists()) {
        const raw  = snap.data().gender || 'male'
        userGender = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase()
      }
    } catch (_) {}

    const result = await joinClass(
      classCode.trim(),
      auth.currentUser.uid,
      auth.currentUser.displayName || 'Student',
      auth.currentUser.email,
      userGender
    )

    if (result.success) {
      handleCloseModal()
      await loadClasses()
      setNotification({ message: `Joined "${result.className}" successfully!`, type: 'success' })
    } else {
      setNotification({ message: `Failed to join: ${result.error}`, type: 'error' })
    }
    setJoining(false)
  }

  /* deterministic gradient per class name */
  const GRADIENTS = [
    ['#0038A8','#0057ff'], ['#1a56db','#0284c7'], ['#065f46','#059669'],
    ['#7c3aed','#a855f7'], ['#b45309','#f59e0b'], ['#be123c','#f43f5e'],
    ['#0e7490','#06b6d4'], ['#374151','#6b7280'],
  ]
  const cardGradient = (name = '') => {
    const idx  = [...name].reduce((s, c) => s + c.charCodeAt(0), 0) % GRADIENTS.length
    const [a, b] = GRADIENTS[idx]
    return `linear-gradient(135deg, ${a} 0%, ${b} 100%)`
  }
  const cardInitial = (name = '') => name.trim()[0]?.toUpperCase() || '?'

  const hour     = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="sd-page">

      {/* ── HERO ── */}
      <header className="sd-hero">
        <div className="sd-hero-bg" aria-hidden="true">
          <span className="sd-circle sd-circle--1" />
          <span className="sd-circle sd-circle--2" />
          <span className="sd-circle sd-circle--3" />
        </div>

        <div className="sd-hero-inner">
          <div className="sd-hero-text">
            <p className="sd-hero-greeting">{greeting},</p>
            <h1 className="sd-hero-name">{userName}</h1>
            <p className="sd-hero-sub">Here's your academic overview for today.</p>
          </div>
          <button className="sd-join-btn" onClick={handleJoinClass}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Join Class
          </button>
        </div>

        {/* stat strip */}
        <div className="sd-stats">
          {[
            { label: 'Pending',   val: pendingCount,   mod: 'pending' },
            { label: 'Completed', val: completedCount, mod: 'done'    },
            { label: 'Overdue',   val: overdueCount,   mod: 'overdue' },
          ].map(({ label, val, mod }, i) => (
            <div key={mod} className={`sd-stat sd-stat--${mod}`} style={{ '--i': i }}>
              <span className="sd-stat-val">{loading ? '—' : val}</span>
              <span className="sd-stat-lbl">{label}</span>
            </div>
          ))}
        </div>
      </header>

      {/* ── BODY ── */}
      <main className="sd-body">

        {/* ANNOUNCEMENTS */}
        <section className="sd-section" style={{ '--si': 0 }}>
          <div className="sd-section-top">
            <h2 className="sd-section-title">Announcements</h2>
            <button className="sd-view-all" onClick={() => navigate('/dashboard/announcements')}>
              View all
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>
          {loading ? (
            <div className="sd-ann-empty">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              <p>Loading announcements…</p>
            </div>
          ) : announcements.length > 0 ? (
            <div className="sd-ann-list">
              {(() => {
                const a = announcements[0]
                return (
                  <button
                    key={a.id}
                    type="button"
                    className="sd-ann-card sd-ann-card--compact"
                    onClick={() => navigate('/dashboard/announcements')}
                    aria-label="View latest announcement"
                  >
                    <div className="sd-ann-kicker">
                      <div className="sd-ann-kicker-left">
                        <span className="sd-ann-pill">Latest</span>
                        {a.className && <span className="sd-ann-class">{a.className}</span>}
                      </div>
                      {a.createdAt && <span className="sd-ann-kicker-date">{formatDateTime(a.createdAt)}</span>}
                    </div>

                    <div className="sd-ann-head">
                      <span className="sd-ann-icon" aria-hidden="true">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                        </svg>
                      </span>
                      <p className="sd-ann-title">{a.title}</p>
                    </div>

                    {a.content && (
                      <p className="sd-ann-preview">
                        {a.content.length > 160 ? a.content.slice(0, 160) + '…' : a.content}
                      </p>
                    )}
                  </button>
                )
              })()}
            </div>
          ) : (
            <div className="sd-ann-empty">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              <p>No announcements yet — check back later.</p>
            </div>
          )}
        </section>

        {/* CLASSES */}
        <section className="sd-section" style={{ '--si': 1 }}>
          <div className="sd-section-top">
            <h2 className="sd-section-title">
              My Classes
              {!loading && classes.length > 0 && (
                <span className="sd-badge">{classes.length}</span>
              )}
            </h2>
            <div className="sd-section-actions">
              <button className="sd-view-all" onClick={() => navigate('/dashboard/class')}>
                View all
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="sd-grid">
              {[0,1,2,3].map(i => (
                <div key={i} className="sd-skeleton" style={{ '--ci': i }} />
              ))}
            </div>
          ) : classes.length > 0 ? (
            <div className="sd-grid">
              {classes.slice(0, 4).map((cls, i) => (
                <button
                  key={cls.id}
                  className="sd-card"
                  style={{ '--ci': i, '--grad': cardGradient(cls.name) }}
                  onClick={() => handleClassClick(cls.id)}
                >
                  <div className="sd-card-banner">
                    <span className="sd-card-initial">{cardInitial(cls.name)}</span>
                    <span className="sd-card-deco" aria-hidden="true" />
                  </div>
                  <div className="sd-card-body">
                    <p className="sd-card-name">{cls.name}</p>
                    <p className="sd-card-teacher">{cls.teacherName}</p>
                    <p className="sd-card-meta">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                      </svg>
                      {cls.studentCount || 0} students
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="sd-empty">
              <div className="sd-empty-icon">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                </svg>
              </div>
              <p className="sd-empty-title">No classes yet</p>
              <p className="sd-empty-sub">Use a class code from your teacher to get started.</p>
              <button className="sd-empty-cta" onClick={handleJoinClass}>Join a Class</button>
            </div>
          )}
        </section>
      </main>

      {/* ── JOIN MODAL ── */}
      {showJoinModal && (
        <div className="sd-overlay" onClick={handleCloseModal}>
          <div className="sd-modal" onClick={e => e.stopPropagation()}>
            <div className="sd-modal-hd">
              <h3 className="sd-modal-title">Join a Class</h3>
              <button className="sd-modal-x" onClick={handleCloseModal} aria-label="Close">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <form onSubmit={handleJoinSubmit}>
              <div className="sd-modal-bd">
                <label className="sd-label" htmlFor="sd-code">Class Code</label>
                <input
                  id="sd-code"
                  className="sd-input"
                  type="text"
                  value={classCode}
                  onChange={e => setClassCode(e.target.value.toUpperCase())}
                  placeholder="e.g. AB1C2D"
                  autoComplete="off"
                  autoFocus
                  required
                />
                <p className="sd-hint">Ask your teacher for the 6-character class code.</p>
              </div>
              <div className="sd-modal-ft">
                <button type="button" className="sd-modal-cancel" onClick={handleCloseModal} disabled={joining}>
                  Cancel
                </button>
                <button type="submit" className="sd-modal-submit" disabled={joining}>
                  {joining ? 'Joining…' : 'Join Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
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