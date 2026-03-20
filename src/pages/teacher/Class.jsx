import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '../../config/firebase'
import { getTeacherClasses, deleteClass } from '../../services/classService'
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
      const teacherClasses = await getTeacherClasses(auth.currentUser.uid)
      setClasses(teacherClasses)
      setLoading(false)
    }
  }

  const handleClassClick = (classId) => {
    navigate(`/teacher-dashboard/class/${classId}`)
  }

  const handleCopyCode = (e, classCode, className) => {
    e.stopPropagation()
    navigator.clipboard.writeText(classCode)
    setNotification({
      message: `Class code "${classCode}" copied to clipboard!`,
      type: 'success'
    })
  }

  const handleDeleteClass = async (e, classId, className) => {
    e.stopPropagation()
    setConfirmDialog({
      title: 'Delete Class',
      message: `Are you sure you want to delete "${className}"? This action cannot be undone and all students will be removed from the class.`,
      onConfirm: async () => {
        setConfirmDialog(null)
        const result = await deleteClass(classId)
        if (result.success) {
          setNotification({
            message: `Class "${className}" deleted successfully`,
            type: 'success'
          })
          loadClasses()
        } else {
          setNotification({
            message: `Failed to delete class: ${result.error}`,
            type: 'error'
          })
        }
      },
      onCancel: () => setConfirmDialog(null),
      confirmText: 'Delete',
      type: 'danger'
    })
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
              <div className="class-card-header" style={{ position: 'relative' }}>
                <div>
                  <h3 className="class-title">{classItem.name}</h3>
                  <p className="class-teacher">Teacher: {classItem.teacherName || auth.currentUser.displayName}</p>
                  <p className="class-students">Students: {classItem.studentCount || 0}</p>
                  <div className="class-code-container">
                    <span className="class-code">Code: {classItem.classCode}</span>
                  </div>
                </div>
                <button
                  className="btn-delete-assignment"
                  style={{ position: 'absolute', top: '0px', right: '0px' }}
                  onClick={(e) => handleDeleteClass(e, classItem.id, classItem.name)}
                  title="Delete Class"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                </button>
              </div>
              <div className="class-card-body">
                <div className="class-info">
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
