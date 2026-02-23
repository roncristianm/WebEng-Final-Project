import '../../styles/Dashboard.css'

function Announcements() {
  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h1>Announcements</h1>
      </div>
      
      <div className="announcements-list">
        <div className="empty-state-large">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <p>No announcements yet</p>
        </div>
      </div>
    </div>
  )
}

export default Announcements
