import { useState, useEffect, useRef } from 'react'
import CreateClassModal from '../../components/CreateClassModal'
import { useLocation, useNavigate } from 'react-router-dom'
import { auth } from '../../config/firebase'
import { createClass, getTeacherClasses } from '../../services/classService'
import Notification from '../../components/Notification'
import '../../styles/TeacherDashboard.css'

/* ── Custom dropdown — avoids the OS-native ugly select ── */
function CustomSelect({ value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selected = options.find(o => (o.value ?? o) === value)
  const label    = selected ? (selected.label ?? selected) : placeholder

  return (
    <div className="cs-wrap" ref={ref}>
      <button
        type="button"
        className={`cs-trigger td-input ${open ? 'cs-trigger--open' : ''}`}
        onClick={() => setOpen(v => !v)}
      >
        <span className={value ? 'cs-val' : 'cs-placeholder'}>{label}</span>
        <svg className="cs-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && (
        <div className="cs-dropdown">
          {options.map(opt => {
            const val = opt.value ?? opt
            const lbl = opt.label ?? opt
            const active = val === value
            return (
              <button
                key={val}
                type="button"
                className={`cs-option ${active ? 'cs-option--active' : ''}`}
                onClick={() => { onChange(val); setOpen(false) }}
              >
                {lbl}
                {active && (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}


export default function Dashboard() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const userName  = auth.currentUser?.displayName || 'Teacher'

  const [showCreateModal,  setShowCreateModal]  = useState(false)
  const [showAssignModal,  setShowAssignModal]  = useState(false)
  const [assignForm,       setAssignForm]       = useState({ title: '', description: '', classId: '', type: 'Written Works', quarter: 'Q1', possibleScore: 100, deadlineDate: '', deadlineTime: '' })
  const [assigning,        setAssigning]        = useState(false)
  const [classes,         setClasses]         = useState([])
  const [loading,         setLoading]         = useState(true)
  const [creating,        setCreating]        = useState(false)
  const [notification,    setNotification]    = useState(null)

  useEffect(() => {
    loadClasses()
    if (location.state?.openCreateClass) {
      setShowCreateModal(true)
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [])

  const loadClasses = async () => {
    if (!auth.currentUser) return
    const teacherClasses = await getTeacherClasses(auth.currentUser.uid)
    setClasses(teacherClasses)
    setLoading(false)
  }

  const handleCreateClass      = () => setShowCreateModal(true)
  const handleCreateAssignment = () => {
    const now = new Date()
    setAssignForm({
      title: '', description: '', classId: '', type: 'Written Works',
      quarter: 'Q1', possibleScore: 100,
      deadlineDate: now.toLocaleDateString('en-CA'),
      deadlineTime: now.toTimeString().slice(0,5),
    })
    setShowAssignModal(true)
  }

  const handleAssignSubmit = async (e) => {
    e.preventDefault()
    if (!assignForm.classId || !assignForm.title) return
    setAssigning(true)
    try {
      const { createAssignmentSingle } = await import('../../services/assignmentService')
      const selectedClass = classes.find(c => c.id === assignForm.classId)
      const deadline = `${assignForm.deadlineDate}T${assignForm.deadlineTime}`
      const result = await createAssignmentSingle({
        title:        assignForm.title,
        description:  assignForm.description,
        classId:      assignForm.classId,
        className:    selectedClass?.name || '',
        teacherId:    auth.currentUser.uid,
        teacherName:  auth.currentUser.displayName || 'Teacher',
        type:         assignForm.type,
        quarter:      assignForm.quarter,
        possibleScore: parseFloat(assignForm.possibleScore),
        deadline,
      })
      if (result.success) {
        setShowAssignModal(false)
        setNotification({ message: 'Assignment created successfully!', type: 'success' })
      } else {
        setNotification({ message: `Error: ${result.error}`, type: 'error' })
      }
    } catch (err) {
      setNotification({ message: 'Failed to create assignment.', type: 'error' })
    }
    setAssigning(false)
  }
  const handleClassClick       = (id) => navigate(`/teacher-dashboard/class/${id}`)

  const handleCopyCode = (e, classCode, className) => {
    e.stopPropagation()
    navigator.clipboard.writeText(classCode)
    setNotification({ message: `Class code "${classCode}" copied!`, type: 'success' })
  }

  const handleCreateClassModal = async ({ className, grade, section, sheetId }) => {
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
      setNotification({
        message: `"${className.trim()}" created! Code: ${result.classCode}`,
        type: 'success',
      })
    } else {
      setNotification({ message: `Failed to create class: ${result.error}`, type: 'error' })
    }
    setCreating(false)
  }

  /* deterministic gradient per class name */
  const GRADIENTS = [
    ['#0038A8','#0057ff'], ['#1a56db','#0284c7'], ['#065f46','#059669'],
    ['#7c3aed','#a855f7'], ['#b45309','#f59e0b'], ['#be123c','#f43f5e'],
    ['#0e7490','#06b6d4'], ['#374151','#6b7280'],
  ]
  const cardGradient = (name = '') => {
    const idx    = [...name].reduce((s, c) => s + c.charCodeAt(0), 0) % GRADIENTS.length
    const [a, b] = GRADIENTS[idx]
    return `linear-gradient(135deg, ${a} 0%, ${b} 100%)`
  }
  const cardInitial = (name = '') => name.trim()[0]?.toUpperCase() || '?'

  const hour     = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const totalStudents = classes.reduce((s, c) => s + (c.studentCount || 0), 0)

  return (
    <div className="td-page">

      {/* ── HERO ── */}
      <header className="td-hero">
        <div className="td-hero-bg" aria-hidden="true">
          <span className="td-circle td-circle--1" />
          <span className="td-circle td-circle--2" />
          <span className="td-circle td-circle--3" />
        </div>

        <div className="td-hero-inner">
          <div className="td-hero-text">
            <p className="td-hero-greeting">{greeting},</p>
            <h1 className="td-hero-name">{userName}</h1>
            <p className="td-hero-sub">Manage your classes and assignments from here.</p>
          </div>
          <div className="td-hero-actions">
            <button className="td-btn-create" onClick={handleCreateClass}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Create Class
            </button>
            <button className="td-btn-assign" onClick={handleCreateAssignment}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="12" y1="18" x2="12" y2="12"/>
                <line x1="9" y1="15" x2="15" y2="15"/>
              </svg>
              New Assignment
            </button>
          </div>
        </div>

        {/* stat strip */}
        <div className="td-stats">
          <div className="td-stat td-stat--classes" style={{ '--i': 0 }}>
            <span className="td-stat-val">{loading ? '—' : classes.length}</span>
            <span className="td-stat-lbl">Active Classes</span>
          </div>
          <div className="td-stat td-stat--students" style={{ '--i': 1 }}>
            <span className="td-stat-val">{loading ? '—' : totalStudents}</span>
            <span className="td-stat-lbl">Total Students</span>
          </div>
        </div>
      </header>

      {/* ── BODY ── */}
      <main className="td-body">

        {/* CLASSES SECTION */}
        <section className="td-section" style={{ '--si': 0 }}>
          <div className="td-section-top">
            <h2 className="td-section-title">
              My Classes
              {!loading && classes.length > 0 && (
                <span className="td-badge">{classes.length}</span>
              )}
            </h2>
            <button className="td-view-all" onClick={() => navigate('/teacher-dashboard/class')}>
              View all
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>

          {loading ? (
            <div className="td-grid">
              {[0,1,2,3].map(i => (
                <div key={i} className="td-skeleton" style={{ '--ci': i }} />
              ))}
            </div>
          ) : classes.length > 0 ? (
            <div className="td-grid">
              {classes.slice(0, 4).map((cls, i) => (
                <button
                  key={cls.id}
                  className="td-card"
                  style={{ '--ci': i, '--grad': cardGradient(cls.name) }}
                  onClick={() => handleClassClick(cls.id)}
                >
                  <div className="td-card-banner">
                    <span className="td-card-initial">{cardInitial(cls.name)}</span>
                    <span className="td-card-deco" aria-hidden="true" />
                    {/* grade / section badge */}
                    {(cls.grade || cls.section) && (
                      <span className="td-card-grade-badge">
                        {cls.grade && `Gr.${cls.grade}`}{cls.grade && cls.section ? ' · ' : ''}{cls.section}
                      </span>
                    )}
                  </div>
                  <div className="td-card-body">
                    <p className="td-card-name">{cls.name}</p>

                    {/* class code row */}
                    <div
                      className="td-card-code"
                      onClick={(e) => handleCopyCode(e, cls.classCode, cls.name)}
                      title="Copy class code"
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                      </svg>
                      <code>{cls.classCode}</code>
                    </div>

                    <p className="td-card-meta">
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
            <div className="td-empty">
              <div className="td-empty-icon">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                </svg>
              </div>
              <p className="td-empty-title">No classes yet</p>
              <p className="td-empty-sub">Create your first class to start managing students and assignments.</p>
              <button className="td-empty-cta" onClick={handleCreateClass}>Create a Class</button>
            </div>
          )}
        </section>
      </main>


      {/* ── CREATE ASSIGNMENT MODAL ── */}
      {showAssignModal && (
        <div className="td-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="td-modal" onClick={e => e.stopPropagation()}>
            <div className="td-modal-hd">
              <h3 className="td-modal-title">New Assignment</h3>
              <button className="td-modal-x" onClick={() => setShowAssignModal(false)} aria-label="Close">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <form onSubmit={handleAssignSubmit}>
              <div className="td-modal-bd">
                <div className="td-field">
                  <label className="td-label">Title *</label>
                  <input className="td-input" value={assignForm.title} onChange={e => setAssignForm(f => ({ ...f, title: e.target.value }))} placeholder="Assignment title" required />
                </div>
                <div className="td-field">
                  <label className="td-label">Description</label>
                  <textarea className="td-input td-textarea" value={assignForm.description} onChange={e => setAssignForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="Instructions…" />
                </div>
                <div className="td-field">
                  <label className="td-label">Class *</label>
                  <CustomSelect
                    value={assignForm.classId}
                    onChange={val => setAssignForm(f => ({ ...f, classId: val }))}
                    options={classes.map(c => ({ value: c.id, label: c.name }))}
                    placeholder="Select a class"
                  />
                </div>
                <div className="td-field-row">
                  <div className="td-field">
                    <label className="td-label">Type *</label>
                    <CustomSelect
                      value={assignForm.type}
                      onChange={val => setAssignForm(f => ({ ...f, type: val }))}
                      options={['Written Works', 'Performance Task', 'Quarterly Assessment']}
                      placeholder="Select type"
                    />
                  </div>
                  <div className="td-field">
                    <label className="td-label">Quarter *</label>
                    <CustomSelect
                      value={assignForm.quarter}
                      onChange={val => setAssignForm(f => ({ ...f, quarter: val }))}
                      options={[
                        { value: 'Q1', label: '1st Quarter' },
                        { value: 'Q2', label: '2nd Quarter' },
                        { value: 'Q3', label: '3rd Quarter' },
                        { value: 'Q4', label: '4th Quarter' },
                      ]}
                      placeholder="Select quarter"
                    />
                  </div>
                </div>
                <div className="td-field">
                  <label className="td-label">Possible Score *</label>
                  <input className="td-input" type="number" min="1" value={assignForm.possibleScore} onChange={e => setAssignForm(f => ({ ...f, possibleScore: e.target.value }))} required />
                </div>
                <div className="td-field-row">
                  <div className="td-field">
                    <label className="td-label">Deadline Date *</label>
                    <input className="td-input" type="date" value={assignForm.deadlineDate} onChange={e => setAssignForm(f => ({ ...f, deadlineDate: e.target.value }))} required />
                  </div>
                  <div className="td-field">
                    <label className="td-label">Deadline Time *</label>
                    <input className="td-input" type="time" value={assignForm.deadlineTime} onChange={e => setAssignForm(f => ({ ...f, deadlineTime: e.target.value }))} required />
                  </div>
                </div>
              </div>
              <div className="td-modal-ft">
                <button type="button" className="td-modal-cancel" onClick={() => setShowAssignModal(false)} disabled={assigning}>Cancel</button>
                <button type="submit" className="td-modal-submit" disabled={assigning}>{assigning ? 'Creating…' : 'Create Assignment'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── CREATE CLASS MODAL ── */}
      <CreateClassModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateClassModal}
        creating={creating}
      />

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