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
              <div className="class-card-header">
                <div>
                  <h3>{classItem.name}</h3>
                  <div className="class-code-container">
                    <span className="class-code">Code: {classItem.classCode}</span>
                    <button 
                      className="btn-copy-code"
                      onClick={(e) => handleCopyCode(e, classItem.classCode, classItem.name)}
                      title="Copy class code"
                    >
                      📋
                    </button>
                  </div>
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
