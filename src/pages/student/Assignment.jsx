import { useState, useEffect } from 'react'
import { auth } from '../../config/firebase'
import { getStudentClasses } from '../../services/classService'
import { getStudentAssignments, submitAssignment } from '../../services/assignmentService'
import Notification from '../../components/Notification'
import '../../styles/Dashboard.css'

function Assignment() {
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [notification, setNotification] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedAssignment, setSelectedAssignment] = useState(null)

  useEffect(() => {
    loadAssignments()
  }, [])

  const loadAssignments = async () => {
    if (auth.currentUser) {
      // Get student's classes first
      const studentClasses = await getStudentClasses(auth.currentUser.uid)
      const classIds = studentClasses.map(cls => cls.id)
      
      // Get assignments for those classes
      const studentAssignments = await getStudentAssignments(auth.currentUser.uid, classIds)
      setAssignments(studentAssignments)
      setLoading(false)
    }
  }

  const handleSubmit = async (assignmentId, deadline) => {
    const result = await submitAssignment(assignmentId, auth.currentUser.uid, deadline)
    
    if (result.success) {
      setNotification({ 
        message: result.status === 'late' 
          ? 'Assignment submitted (Late)' 
          : 'Assignment submitted successfully!', 
        type: result.status === 'late' ? 'warning' : 'success' 
      })
      loadAssignments()
      // If the modal is open, update the selected assignment
      if (selectedAssignment && selectedAssignment.id === assignmentId) {
        const updatedAssignment = { 
          ...selectedAssignment, 
          submission: { ...selectedAssignment.submission, status: result.status, submittedAt: new Date() }
        }
        setSelectedAssignment(updatedAssignment)
      }
    } else {
      setNotification({ message: `Error: ${result.error}`, type: 'error' })
    }
  }

  const handleViewDetails = (assignment) => {
    setSelectedAssignment(assignment)
    setShowDetailModal(true)
  }

  const getAssignmentTypeColor = (type) => {
    switch(type) {
      case 'Written Works': return '#3b82f6'
      case 'Performance Task': return '#10b981'
      case 'Quarterly Assessment': return '#f59e0b'
      default: return '#6b7280'
    }
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

  const getStatusBadge = (status) => {
    const badges = {
      done: { text: 'Submitted', color: '#10b981' },
      late: { text: 'Late', color: '#ef4444' },
      not_submitted: { text: 'Not Submitted', color: '#6b7280' }
    }
    const badge = badges[status] || badges.not_submitted
    return (
      <span style={{
        padding: '6px 16px',
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

  const isOverdue = (deadline) => {
    return new Date(deadline) < new Date()
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Assignments</h1>
        <p className="page-subtitle">Track and submit your assignments</p>
      </div>

      {loading ? (
        <div className="loading-container">
          <p>Loading assignments...</p>
        </div>
      ) : assignments.length > 0 ? (
        <div className="assignments-grid">
          {assignments.map((assignment) => {
            const submission = assignment.submission || { status: 'not_submitted' }
            const overdue = isOverdue(assignment.deadline)
            
            return (
              <div
                key={assignment.id}
                className="assignment-card"
                onClick={() => handleViewDetails(assignment)}
                style={{ 
                  borderLeft: `4px solid ${getAssignmentTypeColor(assignment.type)}`,
                  cursor: 'pointer'
                }}
              >
                <div className="assignment-card-header">
                  <div>
                    <h3>{assignment.title}</h3>
                    <span className="assignment-type" style={{ color: getAssignmentTypeColor(assignment.type) }}>
                      {assignment.type}
                    </span>
                  </div>
                </div>
                <div className="assignment-card-body">
                  <p className="assignment-class">{assignment.className}</p>
                  <div className="assignment-dates">
                    <div className="assignment-date">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                      </svg>
                      <span style={{ color: overdue && submission.status === 'not_submitted' ? '#ef4444' : 'inherit' }}>
                        Due: {formatDeadline(assignment.deadline)}
                      </span>
                    </div>
                  </div>
                  <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {getStatusBadge(submission.status)}
                    {submission.status === 'not_submitted' && (
                      <button
                        className="btn-submit"
                        style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSubmit(assignment.id, assignment.deadline)
                        }}
                      >
                        Submit
                      </button>
                    )}
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
            <p>You don't have any assignments at the moment.</p>
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
                  <span className="info-label">Deadline:</span>
                  <span>{formatDeadline(selectedAssignment.deadline)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Status:</span>
                  <span>{getStatusBadge(selectedAssignment.submission?.status || 'not_submitted')}</span>
                </div>
              </div>

              <div style={{ marginTop: '24px' }}>
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

              {selectedAssignment.submission?.status === 'not_submitted' && (
                <div style={{ marginTop: '24px', textAlign: 'right' }}>
                  <button
                    className="btn-submit"
                    onClick={() => {
                      handleSubmit(selectedAssignment.id, selectedAssignment.deadline)
                    }}
                  >
                    Submit Assignment
                  </button>
                </div>
              )}
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
    </div>
  )
}

export default Assignment
