import { useNavigate } from 'react-router-dom'
import { auth } from '../../config/firebase'
import '../../styles/Dashboard.css'

function Dashboard() {
  const navigate = useNavigate()
  const userName = auth.currentUser?.displayName || 'Teacher'

  const handleCreateClass = () => {
    navigate('/teacher-dashboard/class')
  }

  const handleCreateAssignment = () => {
    navigate('/teacher-dashboard/assignment')
  }

  return (
    <div className="dashboard-page">
      {/* Top Section - Teacher Name & Action Buttons */}
      <div className="dashboard-header">
        <div className="student-greeting">
          <h1>Welcome, {userName}!</h1>
          <p className="greeting-subtitle">Manage your classes and assignments</p>
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
        </div>
        <div className="empty-classes">
          <p>No classes yet. Create your first class to get started!</p>
        </div>
      </div>

      {/* Quick Stats Section */}
      <div className="quick-stats-section">
        <h2>QUICK STATS</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-number">0</div>
            <div className="stat-label">Total Students</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">0</div>
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
    </div>
  )
}

export default Dashboard
