import { useState, useEffect } from 'react'
import { auth } from '../../config/firebase'
import { getTeacherClasses } from '../../services/classService'
import Notification from '../../components/Notification'
import '../../styles/Assignment.css' // Reuse card styles

function Grade() {
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [notification, setNotification] = useState(null)

  useEffect(() => {
    loadClasses()
  }, [])

  const loadClasses = async () => {
    if (auth.currentUser) {
      const teacherClasses = await getTeacherClasses(auth.currentUser.uid)
      setClasses(teacherClasses.sort((a, b) => a.name.localeCompare(b.name)))
      setLoading(false)
    }
  }

  const handleClassClick = (classItem) => {
    if (classItem.sheetId) {
      window.open(`https://docs.google.com/spreadsheets/d/${classItem.sheetId}/edit`, '_blank')
    }
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-container">
          <p>Loading classes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Grades</h1>
        <p className="page-subtitle">Click a class card to open its Google Sheet</p>
      </div>

      <div className="classes-grid">
        {classes.map((classItem) => (
          <div 
            key={classItem.id}
            className={`class-card ${!classItem.sheetId ? 'no-sheet' : ''}`}
            onClick={() => handleClassClick(classItem)}
          >
            <div className="class-card-header">
              <div>
                <h3>{classItem.name}</h3>
                <p className="class-grade-section">{classItem.grade}-{classItem.section}</p>
                <p className="class-students">{classItem.studentCount || 0} Students</p>
              </div>
              {classItem.sheetId ? (
                <span className="sheet-badge" title="Click to open Google Sheet">📊</span>
              ) : (
                <span className="no-sheet-badge" title="No Sheet configured">⚠️</span>
              )}
            </div>
            {classItem.sheetId && (
              <div className="class-sheet-info">
                <small>Click to open editing</small>
              </div>
            )}
          </div>
        ))}
      </div>

      {classes.length === 0 && (
        <div className="empty-state-container">
          <div className="empty-state-card">
            <h3>No Classes Yet</h3>
            <p>Create classes with Google Sheet IDs in Dashboard to manage grades here.</p>
          </div>
        </div>
      )}

      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  )
}

export default Grade

