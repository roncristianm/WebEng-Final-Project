import { useState, useEffect } from 'react'
import { auth } from '../../config/firebase'
import { getStudentClasses } from '../../services/classService'
import { getStudentAssignments, submitAssignment } from '../../services/assignmentService'
import Notification from '../../components/Notification'
import '../../styles/Assignment.css'

const TYPE_COLORS = {
  'Written Works': '#3b82f6',
  'Performance Task': '#10b981',
  'Quarterly Assessment': '#f59e0b'
}

function Assignment() {
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [notification, setNotification] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedAssignment, setSelectedAssignment] = useState(null)
  const [activeTab, setActiveTab] = useState('upcoming')
  const [score, setScore] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { loadAssignments() }, [])

  const loadAssignments = async () => {
    if (auth.currentUser) {
      const studentClasses = await getStudentClasses(auth.currentUser.uid)
      const classIds = studentClasses.map(cls => cls.id)
      const studentAssignments = await getStudentAssignments(auth.currentUser.uid, classIds)
      setAssignments(studentAssignments)
      setLoading(false)
    }
  }

  const isOverdue = (deadline) => new Date(deadline) < new Date()

  const getTabCounts = () => {
    let upcoming = 0, pastDue = 0, completed = 0
    assignments.forEach(a => {
      const status = a.submission?.status || 'not_submitted'
      const overdue = isOverdue(a.deadline)
      if (!overdue && status === 'not_submitted') upcoming++
      else if (overdue && status === 'not_submitted') pastDue++
      else if (status === 'done' || status === 'late') completed++
    })
    return { upcoming, pastDue, completed }
  }

  const getFiltered = () => {
    switch (activeTab) {
      case 'upcoming': return assignments.filter(a => !isOverdue(a.deadline) && (a.submission?.status || 'not_submitted') === 'not_submitted')
      case 'past-due': return assignments.filter(a => isOverdue(a.deadline) && (a.submission?.status || 'not_submitted') === 'not_submitted')
      case 'completed': return assignments.filter(a => ['done','late'].includes(a.submission?.status))
      default: return assignments
    }
  }

  const handleSubmit = async () => {
    if (!selectedAssignment) return
    const parsedScore = score !== '' ? parseFloat(score) : null

    if (parsedScore === null) {
      setNotification({ message: 'Please enter your score before submitting.', type: 'error' })
      return
    }
    if (parsedScore < 0 || parsedScore > selectedAssignment.possibleScore) {
      setNotification({ message: `Score must be between 0 and ${selectedAssignment.possibleScore}`, type: 'error' })
      return
    }

    setSubmitting(true)
    const result = await submitAssignment(
      selectedAssignment.id,
      auth.currentUser.uid,
      selectedAssignment.deadline,
      parsedScore
    )
    setSubmitting(false)

    if (result.success) {
      setNotification({
        message: result.status === 'late'
          ? `Submitted (Late) — Score ${parsedScore}/${selectedAssignment.possibleScore} recorded to grade sheet`
          : `Submitted! Score ${parsedScore}/${selectedAssignment.possibleScore} recorded to grade sheet`,
        type: result.status === 'late' ? 'warning' : 'success'
      })
      setShowDetailModal(false)
      setScore('')
      loadAssignments()
    } else {
      setNotification({ message: `Error: ${result.error}`, type: 'error' })
    }
  }

  const formatDate = (ds) => ds ? new Date(ds).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'
  const formatTime = (ds) => ds ? new Date(ds).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'N/A'

  const getStatusBadge = (status) => {
    const badges = {
      done: { text: 'Submitted', color: '#10b981' },
      late: { text: 'Late', color: '#ef4444' },
      not_submitted: { text: 'Not Submitted', color: '#6b7280' }
    }
    const b = badges[status] || badges.not_submitted
    return <span style={{ padding: '6px 16px', borderRadius: 12, fontSize: '0.85rem', fontWeight: 500, backgroundColor: `${b.color}20`, color: b.color }}>{b.text}</span>
  }

  const filtered = getFiltered()
  const tabCounts = getTabCounts()

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Assignments</h1>
        <p className="page-subtitle">Track and submit your assignments</p>
      </div>

      <div className="tabs-container">
        {[['upcoming', `Upcoming (${tabCounts.upcoming})`], ['past-due', `Overdue (${tabCounts.pastDue})`], ['completed', `Completed (${tabCounts.completed})`]].map(([key, label]) => (
          <button key={key} className={`tab-btn ${activeTab === key ? 'tab-btn--active' : ''}`} onClick={() => setActiveTab(key)}>{label}</button>
        ))}
      </div>

      {loading ? (
        <div className="loading-container"><p>Loading assignments...</p></div>
      ) : filtered.length > 0 ? (
        <div className="assignments-grid">
          {filtered.map((assignment) => {
            const status = assignment.submission?.status || 'not_submitted'
            const overdue = isOverdue(assignment.deadline)
            return (
              <div key={assignment.id} className="assignment-card"
                onClick={() => { setSelectedAssignment(assignment); setScore(''); setShowDetailModal(true) }}
                style={{ borderLeft: `4px solid ${TYPE_COLORS[assignment.type] || '#6b7280'}`, cursor: 'pointer' }}>
                <div className="assignment-card-header">
                  <div>
                    <h3>{assignment.title}</h3>
                    <span className="assignment-type" style={{ color: TYPE_COLORS[assignment.type] || '#6b7280' }}>{assignment.type}</span>
                    <span style={{ marginLeft: 8, fontSize: 12, color: '#9ca3af' }}>{assignment.quarter} · Item {assignment.itemNumber}</span>
                  </div>
                </div>
                <div className="assignment-card-body">
                  <p className="assignment-class">{assignment.className}</p>
                  <div className="assignment-dates">
                    <div className="assignment-date">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                      <span style={{ color: overdue && status === 'not_submitted' ? '#ef4444' : 'inherit' }}>{formatDate(assignment.deadline)}</span>
                    </div>
                    <div className="assignment-date">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                      </svg>
                      <span style={{ color: overdue && status === 'not_submitted' ? '#ef4444' : 'inherit' }}>{formatTime(assignment.deadline)}</span>
                    </div>
                  </div>
                  <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {getStatusBadge(status)}
                    {status !== 'not_submitted' && assignment.submission?.score !== null && (
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#059669' }}>
                        Score: {assignment.submission.score}/{assignment.possibleScore}
                      </span>
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
              <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            <h3>{activeTab === 'upcoming' ? 'No Upcoming Assignments' : activeTab === 'past-due' ? 'No Overdue Assignments' : 'No Completed Assignments'}</h3>
            <p>{activeTab === 'upcoming' ? 'Check back later for new assignments.' : activeTab === 'past-due' ? 'You\'re all caught up!' : 'Submit assignments to see them here.'}</p>
          </div>
        </div>
      )}

      {/* Detail / Submit Modal */}
      {showDetailModal && selectedAssignment && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>{selectedAssignment.title}</h2>
                <p style={{ fontSize: '0.9rem', color: '#6b7280', marginTop: 4 }}>
                  {selectedAssignment.className} · <span style={{ color: TYPE_COLORS[selectedAssignment.type] }}>{selectedAssignment.type}</span> · {selectedAssignment.quarter} Item {selectedAssignment.itemNumber}
                </p>
              </div>
              <button className="modal-close" onClick={() => setShowDetailModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="assignment-detail-info">
                <div className="info-row"><span className="info-label">Deadline:</span><span>{formatDate(selectedAssignment.deadline)} {formatTime(selectedAssignment.deadline)}</span></div>
                <div className="info-row"><span className="info-label">Possible Score:</span><span>{selectedAssignment.possibleScore}</span></div>
                <div className="info-row"><span className="info-label">Status:</span><span>{getStatusBadge(selectedAssignment.submission?.status || 'not_submitted')}</span></div>
              </div>

              <div style={{ marginTop: 24 }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem' }}>Description</h3>
                <p style={{ color: '#4b5563', lineHeight: 1.6, whiteSpace: 'pre-wrap', backgroundColor: '#f9fafb', padding: 16, borderRadius: 8, margin: 0 }}>
                  {selectedAssignment.description || 'No description provided.'}
                </p>
              </div>

              {/* Sheet info */}
              <div style={{ marginTop: 16, background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#0369a1' }}>
                📊 Your score will be recorded in the <strong>ENGLISH {selectedAssignment.quarter}</strong> sheet under <strong>{selectedAssignment.type}</strong>{selectedAssignment.type !== 'Quarterly Assessment' ? `, Item ${selectedAssignment.itemNumber}` : ''}.
              </div>

              {/* Submit section */}
              {(selectedAssignment.submission?.status || 'not_submitted') === 'not_submitted' ? (
                <div style={{ marginTop: 24 }}>
                  <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
                    Your Score <span style={{ fontWeight: 400, color: '#6b7280' }}>(out of {selectedAssignment.possibleScore})</span>
                  </label>
                  <input
                    type="number"
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                    min="0"
                    max={selectedAssignment.possibleScore}
                    step="0.5"
                    placeholder={`0 – ${selectedAssignment.possibleScore}`}
                    style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #d1d5db', fontSize: 15, marginBottom: 16 }}
                  />
                  <div style={{ textAlign: 'right' }}>
                    <button className="btn-submit" onClick={handleSubmit} disabled={submitting}>
                      {submitting ? 'Submitting...' : '📤 Submit Assignment'}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: 24, padding: 16, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8 }}>
                  <p style={{ margin: 0, color: '#15803d', fontWeight: 600 }}>
                    ✓ Submitted {selectedAssignment.submission?.status === 'late' ? '(Late)' : ''}
                    {selectedAssignment.submission?.score !== null && ` — Score: ${selectedAssignment.submission.score}/${selectedAssignment.possibleScore}`}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
    </div>
  )
}

export default Assignment
