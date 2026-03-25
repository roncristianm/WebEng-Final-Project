import { useState, useEffect } from 'react'
import { auth } from '../../config/firebase'
import { getTeacherClasses } from '../../services/classService'
import Notification from '../../components/Notification'
import '../../styles/Assignment.css'

// ── Main Grade Page ──────────────────────────────────────────────────────────
function Grade() {
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [notification, setNotification] = useState(null)

  useEffect(() => { loadClasses() }, [])

  const loadClasses = async () => {
    if (auth.currentUser) {
      const teacherClasses = await getTeacherClasses(auth.currentUser.uid)
      setClasses(teacherClasses.sort((a, b) => a.name.localeCompare(b.name)))
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-container"><p>Loading classes...</p></div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="section-header">
        <h2>Grades</h2>
        <p className="page-subtitle">Click a class card to open its grade sheet in Google Sheets</p>
      </div>

      <div className="classes-grid">
        {classes.map((classItem) => (
          <div
            key={classItem.id}
            className={`class-card ${!classItem.sheetId ? 'no-sheet' : ''}`}
            onClick={() => {
              if (!classItem.sheetId) {
                setNotification({ message: 'No Google Sheet linked to this class. Edit the class to add a Sheet ID.', type: 'error' })
                return
              }
              window.open(`https://docs.google.com/spreadsheets/d/${classItem.sheetId}/edit`, '_blank', 'noopener,noreferrer')
            }}
            style={{ cursor: classItem.sheetId ? 'pointer' : 'not-allowed' }}
          >
            <div className="class-card-header">
              <div>
                <h3>{classItem.name}</h3>
                <p className="class-grade-section">{classItem.grade}-{classItem.section}</p>
                <p className="class-students">{classItem.studentCount || 0} Students</p>
              </div>
              {classItem.sheetId ? (
                <span className="sheet-badge" title="Click to open grade sheet">📊</span>
              ) : (
                <span className="no-sheet-badge" title="No Sheet linked">⚠️</span>
              )}
            </div>
            {classItem.sheetId ? (
              <div className="class-sheet-info">
                <small>Click to open in Google Sheets</small>
              </div>
            ) : (
              <div className="class-sheet-info">
                <small style={{ color: '#f59e0b' }}>No sheet linked yet</small>
              </div>
            )}
          </div>
        ))}
      </div>

      {classes.length === 0 && (
        <div className="empty-state-container">
          <div className="empty-state-card">
            <h3>No Classes Yet</h3>
            <p>Create classes with Google Sheet IDs in the Dashboard to manage grades here.</p>
          </div>
        </div>
      )}

      {notification && (
        <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />
      )}
    </div>
  )
}

export default Grade
