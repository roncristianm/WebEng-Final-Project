import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '../../config/firebase'
import { getTeacherClasses, deleteClass } from '../../services/classService'
import '../../styles/Dashboard.css'

function Class() {
  const navigate = useNavigate()
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadClasses()
  }, [])

  const loadClasses = async () => {
    if (auth.currentUser) {
      const teacherClasses = await getTeacherClasses(auth.currentUser.uid)
      setClasses(teacherClasses)
      setLoading(false)
    }
  }

  const handleClassClick = (classId) => {
    navigate(`/teacher-dashboard/class/${classId}`)
  }

  const handleDeleteClass = async (e, classId, className) => {
    e.stopPropagation()
    if (window.confirm(`Are you sure you want to delete "${className}"? This action cannot be undone.`)) {
      const result = await deleteClass(classId)
      if (result.success) {
        alert('Class deleted successfully')
        loadClasses()
      } else {
        alert(`Error deleting class: ${result.error}`)
      }
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>My Classes</h1>
        <p className="page-subtitle">View and manage your classes</p>
      </div>

      {loading ? (
        <div className="loading-container">
          <p>Loading classes...</p>
        </div>
      ) : classes.length > 0 ? (
        <div className="classes-grid-full">
          {classes.map((classItem) => (
            <div 
              key={classItem.id} 
              className="class-card-large"
              onClick={() => handleClassClick(classItem.id)}
            >
              <div className="class-card-header">
                <div>
                  <h3>{classItem.name}</h3>
                  <span className="class-code">Code: {classItem.classCode}</span>
                </div>
                <button 
                  className="btn-delete"
                  onClick={(e) => handleDeleteClass(e, classItem.id, classItem.name)}
                  title="Delete class"
                >
                  🗑️
                </button>
              </div>
              <div className="class-card-body">
                <div className="class-info">
                  <div className="info-item">
                    <span className="info-icon">👥</span>
                    <span>{classItem.studentCount || 0} Students</span>
                  </div>
                  <div className="info-item">
                    <span className="info-icon">📅</span>
                    <span>Created {classItem.createdAt ? new Date(classItem.createdAt.seconds * 1000).toLocaleDateString() : 'Recently'}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state-container">
          <div className="empty-state-card">
            <h3>No Classes Yet</h3>
            <p>Create your first class to get started teaching!</p>
            <button 
              className="btn-create-first"
              onClick={() => navigate('/teacher-dashboard')}
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Class
