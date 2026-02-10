import '../../styles/Dashboard.css'

function Calendar() {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Calendar</h1>
        <p className="page-subtitle">Manage your schedule and events</p>
      </div>

      <div className="placeholder-content">
        <div className="placeholder-card">
          <h3>Calendar Page</h3>
          <p>This is a placeholder for the Calendar section.</p>
          <p>Future features will include:</p>
          <ul>
            <li>View class schedules</li>
            <li>Set assignment due dates</li>
            <li>Schedule events and meetings</li>
            <li>Send reminders to students</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default Calendar
