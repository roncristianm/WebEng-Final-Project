import '../../styles/Dashboard.css'

function Grade() {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Grades</h1>
        <p className="page-subtitle">Manage student grades</p>
      </div>

      <div className="placeholder-content">
        <div className="placeholder-card">
          <h3>Grades Page</h3>
          <p>This is a placeholder for the Grades section.</p>
          <p>Future features will include:</p>
          <ul>
            <li>View all student grades</li>
            <li>Enter and update grades</li>
            <li>Generate grade reports</li>
            <li>Track class performance</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default Grade
