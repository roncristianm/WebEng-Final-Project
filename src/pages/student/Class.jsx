import '../../styles/Dashboard.css'

function Class() {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1>My Classes</h1>
        <p className="page-subtitle">View and manage your enrolled classes</p>
      </div>

      <div className="placeholder-content">
        <div className="placeholder-card">
          <h3>Classes Page</h3>
          <p>This is a placeholder for the Classes section.</p>
          <p>Future features will include:</p>
          <ul>
            <li>View all enrolled classes</li>
            <li>Access class materials</li>
            <li>See class schedules</li>
            <li>Join class meetings</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default Class
