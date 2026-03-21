import { useState, useEffect } from 'react'
import CreateClassModal from '../../components/CreateClassModal'
import { useLocation } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import { auth } from '../../config/firebase'
import { createClass, getTeacherClasses } from '../../services/classService'
import Notification from '../../components/Notification'
import '../../styles/Dashboard.css'

function Dashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  const userName = auth.currentUser?.displayName || 'Teacher'
  const [showCreateModal, setShowCreateModal] = useState(false)
  // Remove local state for className, grade, section, sheetId
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [notification, setNotification] = useState(null)
  // Remove local state for sheetId


  useEffect(() => {
    loadClasses()
    // If navigated with state.openCreateClass, open the modal
    if (location.state && location.state.openCreateClass) {
      setShowCreateModal(true)
      // Optionally clear the state so it doesn't reopen on refresh
      navigate(location.pathname, { replace: true, state: {} })
    }
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

  const handleCreateClassModal = async ({ className, grade, section, sheetId }) => {
    if (className.trim() && grade.trim() && section.trim() && auth.currentUser) {
      setCreating(true)
      const result = await createClass(
        className.trim(),
        grade.trim(),
        section.trim(),
        auth.currentUser.uid,
        auth.currentUser.displayName || 'Teacher',
        sheetId || ''
      )
      if (result.success) {
        setShowCreateModal(false)
        await loadClasses()
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
      {/* Top Section - Teacher Name & Stats & Action Buttons */}
      <div className="dashboard-header">
        <div className="student-greeting">
          <h1>Welcome, {userName}!</h1>
        </div>
        <div className="header-status-cards">
          <div className="status-card">
            <span className="status-number">{classes.length}</span>
            <span className="status-label">Active Classes</span>
          </div>
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
      {/* Create Class Modal (should be outside the map/loop) */}
      <CreateClassModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateClassModal}
        creating={creating}
      />

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
