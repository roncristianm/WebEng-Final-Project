import { useNavigate } from 'react-router-dom'
import { auth } from '../../config/firebase'
import '../../styles/Dashboard.css'

function Dashboard() {
  const navigate = useNavigate()
  const userName = auth.currentUser?.displayName || 'Teacher'

  const handleCreateClass = () => {
    navigate('/teacher-dashboard/class')
  }

  return (
    <div className="dashboard-page">
      {/* Top Section - Teacher Name & Create Class Button */}
      <div className="dashboard-header">
        <div className="student-greeting">
          <h1>Welcome, {userName}!</h1>
          <p className="greeting-subtitle">Here's what's happening in your classes</p>
        </div>
        <button className="join-class-btn" onClick={handleCreateClass}>
          + Create Class
        </button>
      </div>

      {/* Grid Container */}
      <div className="dashboard-grid">
        {/* Announcements Card */}
        <div className="grid-card announcements">
          <div className="card-header">
            <span className="card-icon">📢</span>
            <h2>Announcements</h2>
          </div>
          <div className="card-body">
            <p className="empty-state">No announcements yet</p>
          </div>
        </div>

        {/* Assignments Card */}
        <div className="grid-card assignments">
          <div className="card-header">
            <span className="card-icon">📝</span>
            <h2>Assignments</h2>
          </div>
          <div className="card-body">
            <p className="empty-state">No assignments yet</p>
          </div>
        </div>

        {/* Materials Card */}
        <div className="grid-card materials">
          <div className="card-header">
            <span className="card-icon">📚</span>
            <h2>Materials</h2>
          </div>
          <div className="card-body">
            <p className="empty-state">No materials yet</p>
          </div>
        </div>

        {/* Pending */}
        <div className="grid-card activity pending">
          <div className="card-icon-large">⏳</div>
          <h3>Pending</h3>
          <p className="count">0</p>
        </div>

        {/* Completed */}
        <div className="grid-card activity completed">
          <div className="card-icon-large">✅</div>
          <h3>Completed</h3>
          <p className="count">0</p>
        </div>

        {/* Overdue */}
        <div className="grid-card activity overdue">
          <div className="card-icon-large">⚠️</div>
          <h3>Overdue</h3>
          <p className="count">0</p>
        </div>




      </div>
    </div>
  )
}

export default Dashboard
