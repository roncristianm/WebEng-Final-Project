import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '../../config/firebase'
import { createClass, getTeacherClasses } from '../../services/classService'
import Notification from '../../components/Notification'
import '../../styles/Dashboard.css'

function Dashboard() {
  const navigate = useNavigate()
  const userName = auth.currentUser?.displayName || 'Teacher'
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [className, setClassName] = useState('')
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [notification, setNotification] = useState(null)

  useEffect(() => {
    loadClasses()
  }, [])

  const loadClasses = async () => {
    if (auth.currentUser) {
      const teacherClasses = await getTeacherClasses(auth.currentUser.uid)
      setClasses(teacherClasses)
      setLoading(false)
    }
  }

  const handleCreateClass = () => {
    setShowCreateModal(true)
  }

  const handleCreateAssignment = () => {
    navigate('/teacher-dashboard/assignment')
  }

  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    if (className.trim() && auth.currentUser) {
      setCreating(true)
      const result = await createClass(
        className.trim(),
        auth.currentUser.uid,
        auth.currentUser.displayName || 'Teacher'
      )
      
      if (result.success) {
        setShowCreateModal(false)
        setClassName('')
        await loadClasses() // Reload classes
        setNotification({
          message: `Class "${className.trim()}" created successfully! Class code: ${result.classCode}`,
          type: 'success'
        })
      } else {
        setNotification({
          message: `Failed to create class: ${result.error}`,
          type: 'error'
        })
      }
      setCreating(false)
    }
  }

  const handleCloseModal = () => {
    setShowCreateModal(false)
    setClassName('')
  }

  const handleClassClick = (classId) => {
    navigate(`/teacher-dashboard/class/${classId}`)
  }

  const handleCopyCode = (e, classCode, className) => {
    e.stopPropagation()
    navigator.clipboard.writeText(classCode)
    setNotification({
      message: `Class code "${classCode}" copied to clipboard!`,
      type: 'success'
    })
  }

  return (
    <div className="dashboard-page">
      {/* Top Section - Teacher Name & Action Buttons */}
      <div className="dashboard-header">
        <div className="student-greeting">
          <h1>Welcome, {userName}!</h1>
        </div>
        <div className="action-buttons">
          <button className="join-class-btn" onClick={handleCreateClass}>
            + Create Class
          </button>
          <button className="join-class-btn" onClick={handleCreateAssignment}>
            + Create Assignment
          </button>
        </div>
      </div>

      {/* My Classes Section */}
      <div className="my-classes-section">
        <div className="section-header">
          <h2>MY CLASSES</h2>
          <button className="btn-view-all" onClick={() => navigate('/teacher-dashboard/class')}>
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
                  <div className="class-code-container">
                    <span className="class-code">Code: {classItem.classCode}</span>
                  </div>
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
            <p>No classes yet. Create your first class to get started!</p>
          </div>
        )}
      </div>

      {/* Quick Stats Section */}
      <div className="quick-stats-section">
        <h2>QUICK STATS</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-number">{classes.reduce((sum, c) => sum + (c.studentCount || 0), 0)}</div>
            <div className="stat-label">Total Students</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{classes.length}</div>
            <div className="stat-label">Active Classes</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">0</div>
            <div className="stat-label">Pending Grades</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">0</div>
            <div className="stat-label">Late Submissions</div>
          </div>
        </div>
      </div>

      {/* Create Class Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Class</h2>
              <button className="modal-close" onClick={handleCloseModal}>&times;</button>
            </div>
            <form onSubmit={handleCreateSubmit}>
              <div className="modal-body">
                <label htmlFor="className">Class Name</label>
                <input
                  type="text"
                  id="className"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="Enter class name"
                  autoFocus
                  required
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={handleCloseModal} disabled={creating}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={creating}>
                  {creating ? 'Creating...' : 'Create Class'}
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
