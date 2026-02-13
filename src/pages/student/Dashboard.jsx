import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '../../config/firebase'
import { joinClass, getStudentClasses } from '../../services/classService'
import Notification from '../../components/Notification'
import '../../styles/Dashboard.css'

function Dashboard() {
  const navigate = useNavigate()
  const userName = auth.currentUser?.displayName || 'Student'
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [classCode, setClassCode] = useState('')
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [notification, setNotification] = useState(null)

  useEffect(() => {
    loadClasses()
  }, [])

  const loadClasses = async () => {
    if (auth.currentUser) {
      const studentClasses = await getStudentClasses(auth.currentUser.uid)
      setClasses(studentClasses)
      setLoading(false)
    }
  }

  const handleJoinClass = () => {
    setShowJoinModal(true)
  }

  const handleJoinSubmit = async (e) => {
    e.preventDefault()
    if (classCode.trim() && auth.currentUser) {
      setJoining(true)
      const result = await joinClass(
        classCode.trim(),
        auth.currentUser.uid,
        auth.currentUser.displayName || 'Student',
        auth.currentUser.email
      )
      
      if (result.success) {
        setShowJoinModal(false)
        setClassCode('')
        await loadClasses() // Reload classes
        setNotification({
          message: `Successfully joined "${result.className}"!`,
          type: 'success'
        })
      } else {
        setNotification({
          message: `Failed to join class: ${result.error}`,
          type: 'error'
        })
      }
      setJoining(false)
    }
  }

  const handleCloseModal = () => {
    setShowJoinModal(false)
    setClassCode('')
  }

  const handleClassClick = (classId) => {
    navigate('/dashboard/class')
  }

  return (
    <div className="dashboard-page">

      {/* Top Section - Student Name & Status Cards & Join Button */}
      <div className="dashboard-header">
        <div className="student-greeting">
          <h1>Welcome, {userName}!</h1>
        </div>
        <div className="header-status-cards">
          <div className="status-card">
            <span className="status-number">0</span>
            <span className="status-label">Pending</span>
          </div>
          <div className="status-card">
            <span className="status-number">0</span>
            <span className="status-label">Completed</span>
          </div>
          <div className="status-card">
            <span className="status-number">0</span>
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
        <div className="announcements-content">
          <p className="empty-state">No announcements yet</p>
        </div>
      </div>

      {/* My Classes Section */}
      <div className="my-classes-section">
        <div className="section-header">
          <h2>MY CLASSES</h2>
          <button className="btn-view-all" onClick={() => navigate('/dashboard/class')}>
            View All
          </button>
        </div>
        {loading ? (
          <div className="loading-state">Loading classes...</div>
        ) : classes.length > 0 ? (
          <div className="classes-grid">
            {classes.slice(0, 4).map((classItem) => (
              <div 
                key={classItem.id} 
                className="class-card"
                onClick={() => handleClassClick(classItem.id)}
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
            <p>No classes yet. Join your first class to get started!</p>
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

      {/* Notification */}
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
