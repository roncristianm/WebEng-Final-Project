import { useState, useEffect } from 'react'
import { auth } from '../../config/firebase'
import { getTeacherClasses } from '../../services/classService'
import { 
  createAssignmentSingle as createAssignment, 
  getTeacherAssignments, 
  deleteAssignment,
  getAssignmentById 
} from '../../services/assignmentService'
import Notification from '../../components/Notification'
import ConfirmDialog from '../../components/ConfirmDialog'
import '../../styles/Assignment.css'

function Assignment() {
  const getCurrentDate = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const getCurrentTime = () => {
    const now = new Date()
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
  }

  const [assignments, setAssignments] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedAssignment, setSelectedAssignment] = useState(null)
  const [notification, setNotification] = useState(null)
  const [confirmDialog, setConfirmDialog] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    classId: '',
    type: 'Written Works',
    possibleScore: 100,
    deadlineDate: getCurrentDate(),
    deadlineTime: getCurrentTime()
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    if (auth.currentUser) {
      const [teacherClasses, teacherAssignments] = await Promise.all([
        getTeacherClasses(auth.currentUser.uid),
        getTeacherAssignments(auth.currentUser.uid)
      ])
      setClasses(teacherClasses)
      setAssignments(teacherAssignments)
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleCreateAssignment = async (e) => {
    e.preventDefault()
    
    if (!formData.title || !formData.description || !formData.classId || !formData.possibleScore || !formData.deadlineDate || !formData.deadlineTime) {
      setNotification({ message: 'Please fill in all fields', type: 'error' })
      return
    }

    const selectedClass = classes.find(c => c.id === formData.classId)
    
    // Combine date and time into a single datetime string
    const deadline = `${formData.deadlineDate}T${formData.deadlineTime}`
    
    const result = await createAssignment({
      title: formData.title,
      description: formData.description,
      classId: formData.classId,
      className: selectedClass.name,
      teacherId: auth.currentUser.uid,
      teacherName: auth.currentUser.displayName,
      type: formData.type,
      possibleScore: formData.possibleScore,
      deadline: deadline
    })

    if (result.success) {
      setNotification({ message: 'Assignment created successfully!', type: 'success' })
      setShowModal(false)
      setFormData({
        title: '',
        description: '',
        classId: '',
        type: 'Written Works',
        possibleScore: 100,
        deadlineDate: getCurrentDate(),
        deadlineTime: getCurrentTime()
      })
      loadData()
    } else {
      setNotification({ message: `Error: ${result.error}`, type: 'error' })
    }
  }

  const handleOpenModal = () => {
    setFormData({
      title: '',
      description: '',
      classId: '',
      type: 'Written Works',
      possibleScore: 100,
      deadlineDate: getCurrentDate(),
      deadlineTime: getCurrentTime()
    })
    setShowModal(true)
  }

  const handleViewAssignment = async (assignmentId) => {
    const assignment = await getAssignmentById(assignmentId)
    if (assignment) {
      setSelectedAssignment(assignment)
      setShowDetailModal(true)
    }
  }

  const handleDeleteAssignment = (e, assignment) => {
    e.stopPropagation()
    setConfirmDialog({
      title: 'Delete Assignment',
      message: `Are you sure you want to delete "${assignment.title}"? This action cannot be undone.`,
      onConfirm: async () => {
        setConfirmDialog(null)
        const result = await deleteAssignment(assignment.id)
        if (result.success) {
          setNotification({ message: 'Assignment deleted successfully', type: 'success' })
          loadData()
        } else {
          setNotification({ message: `Error: ${result.error}`, type: 'error' })
        }
      },
      onCancel: () => setConfirmDialog(null),
      confirmText: 'Delete',
      type: 'danger'
    })
  }

  const getAssignmentTypeColor = (type) => {
    switch(type) {
      case 'Written Works': return '#3b82f6'
      case 'Performance Task': return '#10b981'
      case 'Quarterly Assessment': return '#f59e0b'
      default: return '#6b7280'
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const formatTime = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDeadline = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDateTime = (timestamp) => {
    if (!timestamp) return 'Not submitted'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status) => {
    const badges = {
      done: { text: 'Done', color: '#10b981' },
      late: { text: 'Late', color: '#ef4444' },
      not_submitted: { text: 'Not Submitted', color: '#6b7280' }
    }
    const badge = badges[status] || badges.not_submitted
    return (
      <span style={{
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '0.85rem',
        fontWeight: '500',
        backgroundColor: `${badge.color}20`,
        color: badge.color
      }}>
        {badge.text}
      </span>
    )
  }

  const getSubmissionStats = (submissions) => {
    const done = submissions?.filter(s => s.status === 'done').length || 0
    const late = submissions?.filter(s => s.status === 'late').length || 0
    const notSubmitted = submissions?.filter(s => s.status === 'not_submitted').length || 0
    return { done, late, notSubmitted, total: submissions?.length || 0 }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Assignments</h1>
        <button className="btn-create-assignment" onClick={handleOpenModal}>
          + Create Assignment
        </button>
      </div>

      {loading ? (
        <div className="loading-container">
          <p>Loading assignments...</p>
        </div>
      ) : assignments.length > 0 ? (
        <div className="assignments-grid">
          {assignments.map((assignment) => {
            const stats = getSubmissionStats(assignment.submissions)
            return (
              <div
                key={assignment.id}
                className="assignment-card"
                onClick={() => handleViewAssignment(assignment.id)}
                style={{ borderLeft: `4px solid ${getAssignmentTypeColor(assignment.type)}` }}
              >
                <div className="assignment-card-header">
                  <div>
                    <h3>{assignment.title}</h3>
                    <span className="assignment-type" style={{ color: getAssignmentTypeColor(assignment.type) }}>
                      {assignment.type}
                    </span>
                  </div>
                  <button
                    className="btn-delete-assignment"
                    onClick={(e) => handleDeleteAssignment(e, assignment)}
                    title="Delete assignment"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                  </button>
                </div>
                <div className="assignment-card-body">
                  <p className="assignment-class">{assignment.className}</p>
                  <div className="assignment-dates">
                    <div className="assignment-date">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                      <span>{formatDate(assignment.deadline)}</span>
                    </div>
                    <div className="assignment-date">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                      </svg>
                      <span>{formatTime(assignment.deadline)}</span>
                    </div>
                  </div>
                  <div style={{ 
                    marginTop: '12px', 
                    padding: '8px 12px', 
                    backgroundColor: '#f9fafb', 
                    borderRadius: '6px',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    color: '#374151'
                  }}>
                    {stats.done + stats.late}/{stats.total} Students Completed
                  </div>
                  <div className="assignment-stats">
                    <div className="stat-item" style={{ color: '#10b981' }}>
                      <strong>{stats.done}</strong> Done
                    </div>
                    <div className="stat-item" style={{ color: '#ef4444' }}>
                      <strong>{stats.late}</strong> Late
                    </div>
                    <div className="stat-item" style={{ color: '#6b7280' }}>
                      <strong>{stats.notSubmitted}</strong> Pending
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="empty-state-container">
          <div className="empty-state-card">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            <h3>No Assignments Yet</h3>
            <p>Create your first assignment to get started!</p>
            <button className="btn-create-first" onClick={handleOpenModal}>
              Create Assignment
            </button>
          </div>
        </div>
      )}

      {/* Create Assignment Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Assignment</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateAssignment}>
              <div className="modal-body">
                <label>
                  Assignment Title *
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="Enter assignment title"
                    required
                  />
                </label>

                <label>
                  Description *
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Enter assignment description"
                    rows="4"
                    required
                  />
                </label>

                <label>
                  Class *
                  <select
                    name="classId"
                    value={formData.classId}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select a class</option>
                    {classes.map(cls => (
                      <option key={cls.id} value={cls.id}>{cls.name}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Assignment Type *
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="Written Works">Written Works</option>
                    <option value="Performance Task">Performance Task</option>
                  <option value="Quarterly Assessment">Quarterly Assessment</option>
                  </select>
                </label>

                <label>
                  Possible Score *
                  <input
                    type="number"
                    name="possibleScore"
                    value={formData.possibleScore}
                    onChange={handleInputChange}
                    min="1"
                    max="1000"
                    placeholder="100"
                    required
                  />
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <label>
                    Deadline Date *
                    <input
                      type="date"
                      name="deadlineDate"
                      value={formData.deadlineDate}
                      onChange={handleInputChange}
                      required
                    />
                  </label>

                  <label>
                    Deadline Time *
                    <input
                      type="time"
                      name="deadlineTime"
                      value={formData.deadlineTime}
                      onChange={handleInputChange}
                      required
                    />
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  Create Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assignment Detail Modal */}
      {showDetailModal && selectedAssignment && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>{selectedAssignment.title}</h2>
                <p style={{ fontSize: '0.9rem', color: '#6b7280', marginTop: '4px' }}>
                  {selectedAssignment.className} • {selectedAssignment.type}
                </p>
              </div>
              <button className="modal-close" onClick={() => setShowDetailModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="assignment-detail-info">
                <div className="info-row">
                  <span className="info-label">Deadline Date:</span>
                  <span>{formatDate(selectedAssignment.deadline)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Deadline Time:</span>
                  <span>{formatTime(selectedAssignment.deadline)}</span>
                </div>
              </div>

              <div style={{ marginTop: '24px', marginBottom: '24px' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', color: '#1f2937' }}>Description</h3>
                <p style={{ 
                  color: '#4b5563', 
                  lineHeight: '1.6', 
                  whiteSpace: 'pre-wrap',
                  backgroundColor: '#f9fafb',
                  padding: '16px',
                  borderRadius: '8px',
                  margin: 0
                }}>
                  {selectedAssignment.description || 'No description provided.'}
                </p>
              </div>

              <div className="students-progress-section">
                <h3>Student Progress ({selectedAssignment.submissions?.length || 0} students)</h3>
                <div className="students-list">
                  {selectedAssignment.submissions && selectedAssignment.submissions.length > 0 ? (
                    selectedAssignment.submissions.map((submission) => (
                      <div key={submission.studentId} className="student-progress-item">
                        <div className="student-info">
                          <div className="student-avatar">
                            {submission.studentName?.charAt(0).toUpperCase()}
                          </div>
                          <div className="student-details">
                            <span className="student-name">{submission.studentName}</span>
                            <span className="student-email">{submission.studentEmail}</span>
                          </div>
                        </div>
                        <div className="submission-info">
                          <div className="submission-status">
                            {getStatusBadge(submission.status)}
                          </div>
                          {submission.selfGrade !== undefined && (
                            <div className="student-grade" style={{ fontWeight: 'bold', color: '#059669', marginLeft: '8px' }}>
                              Self: {submission.selfGrade}/{selectedAssignment.possibleScore}
                            </div>
                          )}
                          <div className="submission-time">
                            {formatDateTime(submission.submittedAt)}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="no-students">No students enrolled in this class yet.</p>
                  )}
                </div>
              </div>
            </div>
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

export default Assignment
