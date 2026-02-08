import '../../styles/Dashboard.css'

function Dashboard() {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Welcome to Your Dashboard</h1>
        <p className="page-subtitle">Overview of your academic progress</p>
      </div>

      <div className="placeholder-content">
        <div className="placeholder-card">
          <h3>Dashboard Home</h3>
          <p>This is a placeholder for the Dashboard home page.</p>
          <p>Future features will include:</p>
          <ul>
            <li>Quick overview of all classes</li>
            <li>Upcoming assignments and deadlines</li>
            <li>Recent grades and performance metrics</li>
            <li>Today's schedule and events</li>
            <li>Announcements and notifications</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
