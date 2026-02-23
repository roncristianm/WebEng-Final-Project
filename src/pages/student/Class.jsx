import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '../../config/firebase'
import { getStudentClasses, leaveClass } from '../../services/classService'
import Notification from '../../components/Notification'
import ConfirmDialog from '../../components/ConfirmDialog'
import '../../styles/Dashboard.css'

function Class() {
  const navigate = useNavigate()
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [notification, setNotification] = useState(null)
  const [confirmDialog, setConfirmDialog] = useState(null)

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

  const handleCopyCode = (e, classCode, className) => {
    e.stopPropagation()
    navigator.clipboard.writeText(classCode)
    setNotification({
      message: `Class code "${classCode}" copied to clipboard!`,
      type: 'success'
    })
  }

  const handleLeaveClass = async (e, classId, className) => {
    e.stopPropagation()
    setConfirmDialog({
      title: 'Leave Class',
      message: `Are you sure you want to leave "${className}"? You will need a new class code to rejoin.`,
      onConfirm: async () => {
        setConfirmDialog(null)
        const result = await leaveClass(classId, auth.currentUser.uid)
        if (result.success) {
          setNotification({
            message: `Successfully left "${className}"`,
            type: 'success'
          })
          loadClasses()
        } else {
          setNotification({
            message: `Failed to leave class: ${result.error}`,
            type: 'error'
          })
        }
      },
      onCancel: () => setConfirmDialog(null),
      confirmText: 'Leave',
      type: 'danger'
    })
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
              </div>
              <div className="class-card-body">
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

      {/* Notification */}
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      {/* Confirm Dialog */}
      {confirmDialog && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={confirmDialog.onCancel}
          confirmText={confirmDialog.confirmText}
          type={confirmDialog.type}
        />
      )}
    </div>
  )
}

export default Class
