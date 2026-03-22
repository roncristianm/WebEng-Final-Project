import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { auth } from '../../config/firebase'
import { getClassById, leaveClass, getClassStudents } from '../../services/classService'
import { getClassAssignments } from '../../services/assignmentService'
import { getClassAnnouncements } from '../../services/announcementService'
import { getClassMaterials } from '../../services/materialService'
import Notification from '../../components/Notification'
import ConfirmDialog from '../../components/ConfirmDialog'
import '../../styles/StudentClassDetail.css'

const TABS = ['general', 'assignments', 'announcements', 'materials', 'people']
const TAB_LABELS = {
  general:       'General',
  assignments:   'Assignments',
  announcements: 'Announcements',
  materials:     'Materials',
  people:        'Members',
}

/* ── SVG Icon set (same stroke style as Navbar) ── */
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
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
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

function FeedCard({ title, meta, chip, overdue, children }) {
  return (
    <div className={`scd-feed-card ${overdue ? 'scd-feed-card--overdue' : ''}`}>
      <div className="scd-feed-card-top">
        <div className="scd-feed-card-main">
          {chip && <TypeChip type={chip} />}
          <h3 className="scd-feed-title">{title}</h3>
        </div>
        {meta && <span className="scd-feed-meta">{meta}</span>}
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

export default function ClassDetail() {
  const { classId } = useParams()
  const navigate    = useNavigate()

  const [classData,     setClassData]     = useState(null)
  const [assignments,   setAssignments]   = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [students,      setStudents]      = useState([])
  const [materials,     setMaterials]     = useState([])
  const [loading,       setLoading]       = useState(true)
  const [activeTab,     setActiveTab]     = useState('general')
  const [notification,  setNotification]  = useState(null)
  const [confirmDialog, setConfirmDialog] = useState(null)
  const [copied,        setCopied]        = useState(false)

  useEffect(() => { loadClassData() }, [classId])

  const loadClassData = async () => {
    try {
      const [info, asgn, ann, studs, mats] = await Promise.all([
        getClassById(classId),
        getClassAssignments(classId),
        getClassAnnouncements(classId),
        getClassStudents(classId),
        getClassMaterials(classId),
      ])
      setClassData(info); setAssignments(asgn); setAnnouncements(ann)
      setStudents(studs); setMaterials(mats)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(classData.classCode)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
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

  const upcoming = assignments
    .filter(a => { if (!a.deadline) return false; const d = a.deadline.toDate ? a.deadline.toDate() : new Date(a.deadline); return d > new Date() })
    .sort((a, b) => { const da = a.deadline.toDate ? a.deadline.toDate() : new Date(a.deadline); const db = b.deadline.toDate ? b.deadline.toDate() : new Date(b.deadline); return da - db })

  const feed = [
    ...announcements.map(a => ({ ...a, _type: 'announcement', _date: a.createdAt })),
    ...materials.map(m    => ({ ...m, _type: 'material',      _date: m.createdAt })),
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

      {/* ── BLUE HEADER CARD ── */}
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
              {feed.length === 0 ? <div className="scd-empty">Nothing posted yet.</div>
                : feed.map(item => {
                    if (item._type === 'announcement') return (
                      <FeedCard key={item.id} chip="announcement" title={item.title} meta={formatDateTime(item.createdAt)}>
                        <p>{item.content}</p>
                      </FeedCard>
                    )
                    if (item._type === 'assignment') return (
                      <FeedCard key={item.id} chip="assignment" title={item.title} meta={`Due ${formatDate(item.deadline)}`} overdue={isDeadlinePassed(item.deadline)}>
                        {item.description && <p>{item.description}</p>}
                      </FeedCard>
                    )
                    if (item._type === 'material') return (
                      <FeedCard key={item.id} chip="material" title={item.description?.slice(0, 80) || 'Material'} meta={formatDateTime(item.createdAt)}>
                        {item.files?.length > 0 && (
                          <div className="scd-files">
                            {item.files.map((f, i) => (
                              <a key={i} href={f.url} target="_blank" rel="noopener" className="scd-file-pill">
                                {Icons.materials} {f.filename}
                              </a>
                            ))}
                          </div>
                        )}
                      </FeedCard>
                    )
                    return null
                  })
              }
            </div>
          )}

          {/* ASSIGNMENTS */}
          {activeTab === 'assignments' && (
            <div className="scd-section">
              <h2 className="scd-section-title">Assignments <span className="scd-count">{assignments.length}</span></h2>
              {assignments.length === 0 ? <div className="scd-empty">No assignments yet.</div>
                : assignments.map(a => (
                    <FeedCard key={a.id} title={a.title} meta={`Due ${formatDate(a.deadline)}`} overdue={isDeadlinePassed(a.deadline)}>
                      <div className="scd-asgn-meta">
                        <span className="scd-badge">{a.type}</span>
                        <span className="scd-badge scd-badge--gray">{a.quarter}</span>
                        {a.possibleScore && <span className="scd-badge scd-badge--gray">{a.possibleScore} pts</span>}
                      </div>
                      {a.description && <p className="scd-asgn-desc">{a.description}</p>}
                      <p className="scd-asgn-time">
                        {formatDate(a.deadline)} at {formatTime(a.deadline)}
                        {isDeadlinePassed(a.deadline) && <span className="scd-overdue-tag">Overdue</span>}
                      </p>
                    </FeedCard>
                  ))
              }
            </div>
          )}

          {/* ANNOUNCEMENTS */}
          {activeTab === 'announcements' && (
            <div className="scd-section">
              <h2 className="scd-section-title">Announcements <span className="scd-count">{announcements.length}</span></h2>
              {announcements.length === 0 ? <div className="scd-empty">No announcements yet.</div>
                : announcements.map(a => (
                    <FeedCard key={a.id} title={a.title} meta={formatDateTime(a.createdAt)}>
                      <p>{a.content}</p>
                      <p className="scd-by">By {a.teacherName}</p>
                    </FeedCard>
                  ))
              }
            </div>
          )}

          {/* MATERIALS */}
          {activeTab === 'materials' && (
            <div className="scd-section">
              <h2 className="scd-section-title">Materials <span className="scd-count">{materials.length}</span></h2>
              {materials.length === 0 ? <div className="scd-empty">No materials yet.</div>
                : materials.map(m => (
                    <FeedCard key={m.id} title="Material" meta={formatDateTime(m.createdAt)}>
                      {m.description && <p dangerouslySetInnerHTML={{ __html: linkify(m.description) }} />}
                      {m.files?.length > 0 && (
                        <div className="scd-files">
                          {m.files.map((f, i) => (
                            <a key={i} href={f.url} target="_blank" rel="noopener" className="scd-file-pill">
                              {Icons.materials} {f.filename}
                            </a>
                          ))}
                        </div>
                      )}
                      <p className="scd-by">By {m.teacherName}</p>
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

      {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      {confirmDialog && (
        <ConfirmDialog title={confirmDialog.title} message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm} onCancel={confirmDialog.onCancel}
          confirmText={confirmDialog.confirmText} type={confirmDialog.type} />
      )}
    </div>
  )
}