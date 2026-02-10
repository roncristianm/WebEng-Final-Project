import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '../../config/firebase'
import { joinClass, getStudentClasses } from '../../services/classService'
import '../../styles/Dashboard.css'

function Dashboard() {
  const navigate = useNavigate()
  const userName = auth.currentUser?.displayName || 'Student'
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [classCode, setClassCode] = useState('')
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)

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
        alert(`Successfully joined ${result.className}!`)
      } else {
        alert(`Error: ${result.error}`)
      }
      setJoining(false)
    }
  }

  const handleCloseModal = () => {
    setShowJoinModal(false)
    setClassCode('')
  }

  const handleClassClick = (classId) => {
    navigate(`/dashboard/class/${classId}`)
  }

  return (
    <div className="dashboard-page">
      {/* Top Section - Student Name & Join Class Button */}
      <div className="dashboard-header">
        <div className="student-greeting">
          <h1>Welcome, {userName}!</h1>
        </div>
        <button className="join-class-btn" onClick={handleJoinClass}>
          + Join Class
        </button>
      </div>

      {/* Grid Container */}
      <div className="dashboard-grid">
        {/* Announcements Card */}
        <div className="grid-card announcements">
          <div className="card-header">
            <h2>Announcements</h2>
          </div>
          <div className="card-body">
            <p className="empty-state">No announcements yet</p>
          </div>
        </div>

        {/* Assignments Card */}
        <div className="grid-card assignments">
          <div className="card-header">
            <h2>Assignments</h2>
          </div>
          <div className="card-body">
            <p className="empty-state">No assignments yet</p>
          </div>
        </div>

        {/* Materials Card */}
        <div className="grid-card materials">
          <div className="card-header">
            <h2>Materials</h2>
          </div>
          <div className="card-body">
            <p className="empty-state">No materials yet</p>
          </div>
        </div>
      </div>

      {/* Classwork Status Section */}
      <div className="quick-stats-section">
        <h2>CLASSWORK STATUS</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-number">0</div>
            <div className="stat-label">Pending</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">0</div>
            <div className="stat-label">Completed</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">0</div>
            <div className="stat-label">Overdue</div>
          </div>
        </div>
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
    </div>
  )
}

export default Dashboard
