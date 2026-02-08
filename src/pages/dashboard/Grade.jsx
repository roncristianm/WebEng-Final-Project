import '../../styles/Dashboard.css'

function Grade() {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Grades</h1>
        <p className="page-subtitle">View your academic performance</p>
      </div>

      <div className="placeholder-content">
        <div className="placeholder-card">
          <h3>Grades Page</h3>
          <p>This is a placeholder for the Grades section.</p>
          <p>Future features will include:</p>
          <ul>
            <li>View grades for all classes</li>
            <li>See grade breakdowns</li>
            <li>Track GPA</li>
            <li>View grade history</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default Grade
