import { useNavigate } from 'react-router-dom'
import { auth } from '../../config/firebase'
import '../../styles/Dashboard.css'

function Dashboard() {
  const navigate = useNavigate()
  const userName = auth.currentUser?.displayName || 'Student'

  const handleJoinClass = () => {
    navigate('/dashboard/class')
  }

  return (
    <div className="dashboard-page">
      {/* Top Section - Student Name & Join Class Button */}
      <div className="dashboard-header">
        <div className="student-greeting">
          <h1>Welcome, {userName}!</h1>
          <p className="greeting-subtitle">Here's what's happening in your classes</p>
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
        <h2></h2>
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
    </div>
  )
}

export default Dashboard
