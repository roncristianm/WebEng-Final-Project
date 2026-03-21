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
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [classCode, setClassCode] = useState('')
  const [joining, setJoining] = useState(false)

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

  // Join Class logic
  const handleOpenJoinModal = () => {
    setShowJoinModal(true)
    setClassCode('')
  }
  const handleCloseJoinModal = () => {
    setShowJoinModal(false)
    setClassCode('')
  }
  const handleJoinSubmit = async (e) => {
    e.preventDefault()
    if (!classCode.trim()) return
    setJoining(true)
    try {
      const { joinClass } = await import('../../services/classService')
      const result = await joinClass(
        classCode,
        auth.currentUser.uid,
        auth.currentUser.displayName || '',
        auth.currentUser.email || ''
      )
      if (result.success) {
        setNotification({ message: 'Successfully joined class!', type: 'success' })
        loadClasses()
        setShowJoinModal(false)
      } else {
        setNotification({ message: `Failed to join class: ${result.error}`, type: 'error' })
      }
    } catch (err) {
      setNotification({ message: 'An error occurred while joining class.', type: 'error' })
    }
    setJoining(false)
  }

  return (
    <div className="page-container">
      <div className="section-header">
        <div>
          <h2>My Classes</h2>
          <p className="page-subtitle">View and manage your enrolled classes</p>
        </div>
        <button className="btn-create-assignment" onClick={handleOpenJoinModal}>
          + Join Class
        </button>
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
                  <h3 className="class-title">{classItem.name}</h3>
                  <p className="class-teacher">Teacher: {classItem.teacherName}</p>
                  <p className="class-students">Students: {classItem.studentCount || 0}</p>
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
              onClick={handleOpenJoinModal}
            >
              Join Class
            </button>
                {/* Join Class Modal */}
                {showJoinModal && (
                  <div className="modal-overlay" onClick={handleCloseJoinModal}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                      <div className="modal-header">
                        <h2>Join Class</h2>
                        <button className="modal-close" onClick={handleCloseJoinModal}>&times;</button>
                      </div>
                      <form onSubmit={handleJoinSubmit}>
                        <div className="modal-body">
                          <label htmlFor="classCode">Class Code</label>
                          <input
                            type="text"
                            id="classCode"
                            value={classCode}
                            onChange={e => setClassCode(e.target.value)}
                            placeholder="Enter class code"
                            autoFocus
                            required
                          />
                        </div>
                        <div className="modal-footer">
                          <button type="button" className="btn-cancel" onClick={handleCloseJoinModal} disabled={joining}>
                            Cancel
                          </button>
                          <button type="submit" className="btn-submit" disabled={joining}>
                            {joining ? 'Joining...' : 'Join Class'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
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
