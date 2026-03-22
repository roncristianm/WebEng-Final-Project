import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '../../config/firebase'
import { joinClass, getStudentClasses } from '../../services/classService'
import { getStudentAssignments } from '../../services/assignmentService'
import { getStudentAnnouncements } from '../../services/announcementService'
import Notification from '../../components/Notification'
import '../../styles/Dashboard.css'

function Dashboard() {
  const navigate = useNavigate()
  const userName = auth.currentUser?.displayName || 'Student'
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [classCode, setClassCode] = useState('')
  const [classes, setClasses] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [upcomingAssignments, setUpcomingAssignments] = useState([])
  const [pendingCount, setPendingCount] = useState(0)
  const [completedCount, setCompletedCount] = useState(0)
  const [overdueCount, setOverdueCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [notification, setNotification] = useState(null)

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    if (!auth.currentUser) return

    const studentClasses = await getStudentClasses(auth.currentUser.uid)
    setClasses(studentClasses)

    const classIds = studentClasses.map(cls => cls.id)

    // Load assignments + announcements in parallel
    const [studentAssignments, studentAnnouncements] = await Promise.all([
      getStudentAssignments(auth.currentUser.uid, classIds),
      getStudentAnnouncements(auth.currentUser.uid),
    ])

    // Sort announcements newest first, take top 3 for dashboard preview
    const sorted = [...studentAnnouncements].sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || 0
      const bTime = b.createdAt?.toMillis?.() || 0
      return bTime - aTime
    })
    setAnnouncements(sorted.slice(0, 3))

    // Shared reference point for all time comparisons
    const now = new Date()

    // Upcoming assignments — not submitted, deadline in future, soonest first, top 3
    const upcoming = studentAssignments
      .filter(a => (a.submission?.status || 'not_submitted') === 'not_submitted' && new Date(a.deadline) > now)
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
    setUpcomingAssignments(upcoming.slice(0, 3))

    // Assignment stats
    let pending = 0, completed = 0, overdue = 0

    studentAssignments.forEach(a => {
      const status = a.submission?.status || 'not_submitted'
      const deadline = new Date(a.deadline)
      if (status === 'done') {
        completed++
      } else if (status === 'not_submitted' && deadline > now) {
        pending++
      } else if (status === 'not_submitted' && deadline < now) {
        overdue++
      } else if (status === 'late') {
        overdue++
      }
    })

    setPendingCount(pending)
    setCompletedCount(completed)
    setOverdueCount(overdue)
    setLoading(false)
  }

  const formatDateTime = (timestamp) => {
    if (!timestamp) return ''
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    })
  }

  const handleJoinClass = () => setShowJoinModal(true)

  const handleJoinSubmit = async (e) => {
    e.preventDefault()
    if (!classCode.trim() || !auth.currentUser) return
    setJoining(true)

    let userGender = 'Male'
    try {
      const { getDoc, doc } = await import('firebase/firestore')
      const { db } = await import('../../config/firebase')
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid))
      if (userDoc.exists()) {
        const raw = userDoc.data().gender || 'male'
        userGender = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase()
      }
    } catch (e) {
      console.warn('Could not read user gender, defaulting to Male', e)
    }

    const result = await joinClass(
      classCode.trim(),
      auth.currentUser.uid,
      auth.currentUser.displayName || 'Student',
      auth.currentUser.email,
      userGender
    )

    if (result.success) {
      setShowJoinModal(false)
      setClassCode('')
      await loadDashboard()
      setNotification({ message: `Successfully joined "${result.className}"!`, type: 'success' })
    } else {
      setNotification({ message: `Failed to join class: ${result.error}`, type: 'error' })
    }
    setJoining(false)
  }

  const handleCloseModal = () => {
    setShowJoinModal(false)
    setClassCode('')
  }

  return (
    <div className="dashboard-page">
      {/* Header */}
      <div className="dashboard-header">
        <div className="student-greeting">
          <h1>Welcome, {userName}!</h1>
        </div>
        <div className="header-status-cards">
          <div className="status-card">
            <span className="status-number">{pendingCount}</span>
            <span className="status-label">Pending</span>
          </div>
          <div className="status-card">
            <span className="status-number">{completedCount}</span>
            <span className="status-label">Completed</span>
          </div>
          <div className="status-card">
            <span className="status-number">{overdueCount}</span>
            <span className="status-label">Overdue</span>
          </div>
          <button className="join-class-btn" onClick={handleJoinClass}>
            + Join Class
          </button>
        </div>
      </div>

      {/* Announcements Section */}
      <div className="announcements-section">
        <div className="section-header">
          <h2>ANNOUNCEMENTS</h2>
          <button className="btn-view-all" onClick={() => navigate('/dashboard/announcements')}>
            View All
          </button>
        </div>

        {loading ? (
          <div className="announcements-content">
            <p className="empty-state">Loading…</p>
          </div>
        ) : announcements.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {announcements.map(ann => (
              <div key={ann.id} style={{
                background: '#fff',
                border: '1.5px solid #e5e7eb',
                borderLeft: '4px solid #0038A8',
                borderRadius: 10,
                padding: '12px 16px',
                cursor: 'pointer',
              }} onClick={() => navigate('/dashboard/announcements')}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: '0 0 2px' }}>
                      {ann.title}
                    </p>
                    <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 6px',
                      overflow: 'hidden', display: '-webkit-box',
                      WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {ann.content}
                    </p>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, color: '#0038A8', fontWeight: 600,
                        background: '#eff6ff', padding: '2px 8px', borderRadius: 20 }}>
                        {ann.className}
                      </span>
                      <span style={{ fontSize: 11, color: '#9ca3af' }}>
                        {formatDateTime(ann.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="announcements-content">
            <p className="empty-state">No announcements yet</p>
          </div>
        )}
      </div>

      {/* Assignments Section */}
      <div className="announcements-section">
        <div className="section-header">
          <h2>ASSIGNMENTS</h2>
          <button className="btn-view-all" onClick={() => navigate('/dashboard/assignment')}>
            View All
          </button>
        </div>

        {loading ? (
          <div className="announcements-content">
            <p className="empty-state">Loading…</p>
          </div>
        ) : upcomingAssignments.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {upcomingAssignments.map(ass => (
              <div key={ass.id} style={{
                background: '#fff',
                border: '1.5px solid #e5e7eb',
                borderLeft: '4px solid #0038A8',
                borderRadius: 10,
                padding: '12px 16px',
                cursor: 'pointer',
              }} onClick={() => navigate('/dashboard/assignment')}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: '0 0 2px' }}>
                      {ass.title}
                    </p>
                    <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 6px',
                      overflow: 'hidden', display: '-webkit-box',
                      WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {ass.description || 'No description provided'}
                    </p>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, color: '#0038A8', fontWeight: 600,
                        background: '#f0fdf4', padding: '2px 8px', borderRadius: 20 }}>
                        {ass.className}
                      </span>
                      <span style={{ fontSize: 11, color: '#9ca3af' }}>
                        Due: {formatDateTime(ass.deadline)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="announcements-content">
            <p className="empty-state">No upcoming assignments</p>
          </div>
        )}
      </div>

      {/* My Classes Section */}
      <div className="my-classes-section">
        <div className="section-header">
          <div>
            <h2>MY CLASSES</h2>
            <p className="page-subtitle">View and manage your enrolled classes</p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn-create-assignment" onClick={handleJoinClass}>
              + Join Class
            </button>
            <button className="btn-view-all" onClick={() => navigate('/dashboard/class')}>
              View All
            </button>
          </div>
        </div>
        {loading ? (
          <div className="loading-state">Loading classes...</div>
        ) : classes.length > 0 ? (
          <div className="classes-grid">
            {classes.slice(0, 4).map((classItem) => (
              <div
                key={classItem.id}
                className="class-card"
                onClick={() => navigate(`/dashboard/class/${classItem.id}`)}
              >
                <div className="class-card-header">
                  <h3>{classItem.name}</h3>
                  <span className="class-teacher">Teacher: {classItem.teacherName}</span>
                </div>
                <div className="class-card-body">
                  <div className="class-stat">
                    <span>{classItem.studentCount || 0} Students</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-classes">
            <h3>No Classes Yet</h3>
          </div>
        )}
      </div>

      {/* Join Class Modal */}
      {showJoinModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Join Class</h2>
              <button className="modal-close" onClick={handleCloseModal}>&times;</button>
            </div>
            <form onSubmit={handleJoinSubmit}>
              <div className="modal-body">
                <label htmlFor="classCode">Class Code</label>
                <input
                  type="text"
                  id="classCode"
                  value={classCode}
                  onChange={(e) => setClassCode(e.target.value)}
                  placeholder="Enter class code"
                  autoFocus
                  required
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={handleCloseModal} disabled={joining}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={joining}>
                  {joining ? 'Joining...' : 'Join Class'}
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

export default Dashboard