import '../../styles/Dashboard.css'

function Assignment() {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Assignments</h1>
        <p className="page-subtitle">Create and manage assignments</p>
      </div>

      <div className="placeholder-content">
        <div className="placeholder-card">
          <h3>Assignments Page</h3>
          <p>This is a placeholder for the Assignments section.</p>
          <p>Future features will include:</p>
          <ul>
            <li>Create new assignments</li>
            <li>View all assignments</li>
            <li>Grade submissions</li>
            <li>Track student progress</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default Assignment
