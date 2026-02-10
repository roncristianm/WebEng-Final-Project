import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '../../config/firebase'
import { getStudentClasses, leaveClass } from '../../services/classService'
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
      const studentClasses = await getStudentClasses(auth.currentUser.uid)
      setClasses(studentClasses)
      setLoading(false)
    }
  }

  const handleClassClick = (classId) => {
    navigate(`/dashboard/class/${classId}`)
  }

  const handleLeaveClass = async (e, classId, className) => {
    e.stopPropagation()
    if (window.confirm(`Are you sure you want to leave "${className}"?`)) {
      const result = await leaveClass(classId, auth.currentUser.uid)
      if (result.success) {
        alert('Left class successfully')
        loadClasses()
      } else {
        alert(`Error leaving class: ${result.error}`)
      }
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>My Classes</h1>
        <p className="page-subtitle">View and manage your enrolled classes</p>
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
                  <span className="class-teacher">Teacher: {classItem.teacherName}</span>
                </div>
                <button 
                  className="btn-leave"
                  onClick={(e) => handleLeaveClass(e, classItem.id, classItem.name)}
                  title="Leave class"
                >
                  🚪 Leave
                </button>
              </div>
              <div className="class-card-body">
                <div className="class-info">
                  <div className="info-item">
                    <span className="info-icon">👥</span>
                    <span>{classItem.studentCount || 0} Students</span>
                  </div>
                  <div className="info-item">
                    <span className="info-icon">📝</span>
                    <span>Class Code: {classItem.classCode}</span>
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
            <p>Join a class using a class code to get started!</p>
            <button 
              className="btn-create-first"
              onClick={() => navigate('/dashboard')}
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
