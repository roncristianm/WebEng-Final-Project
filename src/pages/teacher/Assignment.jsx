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

const TYPE_COLORS = {
  'Written Works': '#3b82f6',
  'Performance Task': '#10b981',
  'Quarterly Assessment': '#f59e0b'
}

function Assignment() {
  const getCurrentDate = () => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
  }
  const getCurrentTime = () => {
    const now = new Date()
    return `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
  }

const [assignmentsByType, setAssignmentsByType] = useState({
  writtenWorks: [],
  performanceTask: [],
  quarterlyAssessment: []
})
  const [classes, setClasses] = useState([])
const [loading, setLoading] = useState(true)
  const [selectedClassName, setSelectedClassName] = useState('')
  const [selectedClassId, setSelectedClassId] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedAssignment, setSelectedAssignment] = useState(null)
  const [notification, setNotification] = useState(null)
  const [confirmDialog, setConfirmDialog] = useState(null)
  const [creating, setCreating] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    classId: '',
    type: 'Written Works',
    quarter: 'Q1',
    possibleScore: 100,
    deadlineDate: getCurrentDate(),
    deadlineTime: getCurrentTime()
  })

  useEffect(() => { loadData() }, [selectedClassId])

const loadData = async () => {
    setLoading(true)
    if (auth.currentUser) {
      const teacherClasses = await getTeacherClasses(auth.currentUser.uid)
      setClasses(teacherClasses)
      const selectedClass = teacherClasses.find(c => c.id === selectedClassId)
      setSelectedClassName(selectedClass ? selectedClass.name : '')
      
      if (selectedClassId && teacherClasses.find(c => c.id === selectedClassId)) {
        // Load class-specific assignments and group by type
        const { getClassAssignments } = await import('../../services/assignmentService')
        const classAssignments = await getClassAssignments(selectedClassId)
        
        const grouped = {
          writtenWorks: classAssignments.filter(a => a.type === 'Written Works'),
          performanceTask: classAssignments.filter(a => a.type === 'Performance Task'),
          quarterlyAssessment: classAssignments.filter(a => a.type === 'Quarterly Assessment')
        }
        setAssignmentsByType(grouped)
      } else {
        // No class selected - clear assignments
        setAssignmentsByType({ writtenWorks: [], performanceTask: [], quarterlyAssessment: [] })
      }
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
    const deadline = `${formData.deadlineDate}T${formData.deadlineTime}`

    setCreating(true)
    const result = await createAssignment({
      title: formData.title,
      description: formData.description,
      classId: formData.classId,
      className: selectedClass.name,
      teacherId: auth.currentUser.uid,
      teacherName: auth.currentUser.displayName,
      type: formData.type,
      quarter: formData.quarter,
      possibleScore: parseFloat(formData.possibleScore),
      deadline
    })
    setCreating(false)

    if (result.success) {
      setNotification({ message: 'Assignment created successfully!', type: 'success' })
      setShowModal(false)
      setFormData({
        title: '', description: '', classId: '',
        type: 'Written Works', quarter: 'Q1',
        possibleScore: 100, deadlineDate: getCurrentDate(), deadlineTime: getCurrentTime()
      })
    }
  }

  const formatDate = (ds) => ds ? new Date(ds).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'
  const formatTime = (ds) => ds ? new Date(ds).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'N/A'
  const formatDateTime = (ts) => {
    if (!ts) return 'Not submitted'
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const getStatusBadge = (status) => {
    const badges = {
      done: { text: 'Done', color: '#10b981' },
      late: { text: 'Late', color: '#ef4444' },
      not_submitted: { text: 'Not Submitted', color: '#6b7280' }
    }
    const badge = badges[status] || badges.not_submitted
    return (
      <span style={{ padding: '4px 12px', borderRadius: 12, fontSize: '0.85rem', fontWeight: 500, backgroundColor: `${badge.color}20`, color: badge.color }}>
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
      <div className="section-header">
        <div>
          <h2>{selectedClassId ? `Assignments - ${selectedClassName}` : 'Assignments'}</h2>
          <p className="page-subtitle">{selectedClassId ? `Organized by type: Written Works (30%) | Performance Tasks (50%) | Quarterly Assessments (20%)` : 'Select a class to manage assignments'}</p>
        </div>
        <button className="btn-create-assignment" onClick={() => setShowModal(true)}>
          + New Assignment
        </button>
      </div>

      {/* Class Selector */}
      <div className="class-selector-section" style={{ marginBottom: '2rem', padding: '1.5rem', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', borderRadius: 12, border: '1px solid #e2e8f0' }}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.75rem', fontSize: '1.1rem', color: '#1e293b' }}>
          Select Class to View Assignments:
        </label>
        <div style={{ position: 'relative' }}>
          <select 
            value={selectedClassId || ""}
            onChange={(e) => {
              const value = e.target.value
              setSelectedClassId(value)
              loadData(value)
            }}

            style={{
              width: '100%', 
              padding: '1rem 1.5rem', 
              fontSize: '1.1rem',
              border: '2px solid #e2e8f0',
              borderRadius: 12,
              background: 'white',
              cursor: 'pointer',
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
              backgroundPosition: 'right 0.75rem center',
              backgroundRepeat: 'no-repeat',
              backgroundSize: '1.5em 1.5em',
              paddingRight: '3rem'
            }}
          >
            <option value="" disabled hidden>
              Select a class...
            </option>

            {classes.map(cls => (
              <option key={cls.id} value={cls.id}>
                {cls.name} ({cls.grade || 'N/A'} - {cls.section || 'N/A'}) - {cls.studentCount || 0} students
              </option>
            ))}

          </select>
        </div>
        {!selectedClassId && classes.length > 0 && (
          <p style={{ marginTop: '0.75rem', color: '#64748b', fontSize: '0.95rem' }}>
            Choose a class to see its Written Works, Performance Tasks, and Quarterly Assessments
          </p>
        )}
      </div>

      {loading ? (
        <div className="loading-container">
          <p>{selectedClassId ? 'Loading class assignments...' : 'Loading classes...'}</p>
        </div>
      ) : !selectedClassId ? (
        <div className="empty-state-container">
          <div className="empty-state-card" style={{ maxWidth: '500px' }}>
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '1rem' }}>
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
            <h3>Select a Class</h3>
            <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
              Choose a class from the dropdown above to view and manage its assignments organized by type:
              <br/><strong>Written Works | Performance Tasks | Quarterly Assessments </strong>
            </p>
          </div>
        </div>
      ) : (
        <div className="assignment-columns" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', 
          gap: '2rem', 
          marginTop: '1rem'
        }}>
          {/* Written Works Column */}
          <div className="assignment-column" style={{ 
            background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', 
            padding: '1.5rem', 
            borderRadius: 16, 
            border: '2px solid #bfdbfe'
          }}>
            <div className="column-header" style={{ 
              display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' 
            }}>
              <div style={{ 
                width: 12, height: 12, borderRadius: '50%', 
                backgroundColor: TYPE_COLORS['Written Works'] 
              }}></div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#1e40af' }}>
                Written Works (30%)
              </h3>
              <span style={{ 
                background: 'rgba(59, 130, 246, 0.1)', 
                color: '#1e40af', padding: '0.25rem 0.75rem', 
                borderRadius: 20, fontSize: '0.85rem', fontWeight: 500 
              }}>
                {assignmentsByType.writtenWorks.length}
              </span>
            </div>
            {assignmentsByType.writtenWorks.length > 0 ? (
              <div className="column-grid" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {assignmentsByType.writtenWorks.map((assignment) => {
                  const stats = getSubmissionStats(assignment.submissions)
                  return (
                    <div key={assignment.id} className="assignment-card"
                      onClick={() => handleViewAssignment(assignment.id)}
                      style={{ 
                        borderLeft: `4px solid ${TYPE_COLORS[assignment.type] || '#6b7280'}`,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}>
                      <div className="assignment-card-header">
                        <div>
                          <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem' }}>{assignment.title}</h4>
                          <span style={{ marginLeft: 8, fontSize: 12, color: '#9ca3af' }}>
                            {assignment.quarter} · Item {assignment.itemNumber}
                          </span>
                        </div>
                        <button className="btn-delete-assignment" onClick={(e) => handleDeleteAssignment(e, assignment)} title="Delete">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          </svg>
                        </button>
                      </div>
                      <div className="assignment-card-body">
                        <div className="assignment-dates">
                          <div className="assignment-date">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                            </svg>
                            <span>{formatDate(assignment.deadline)}</span>
                          </div>
                        </div>
                        <div style={{ marginTop: 12, padding: '8px 12px', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 8, fontSize: '0.9rem', fontWeight: 600 }}>
                          {stats.done + stats.late}/{stats.total} Completed
                        </div>
                        <div className="assignment-stats" style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', fontSize: '0.85rem' }}>
                          <span style={{ color: '#10b981' }}><strong>{stats.done}</strong> Done</span>
                          <span style={{ color: '#ef4444' }}><strong>{stats.late}</strong> Late</span>
                          <span style={{ color: '#6b7280' }}><strong>{stats.notSubmitted}</strong> Pending</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                </svg>
                <p style={{ marginTop: '0.5rem', fontSize: '1rem' }}>No Written Works yet</p>
                <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>Create the first one for this class</p>
              </div>
            )}
          </div>

          {/* Performance Task Column */}
          <div className="assignment-column" style={{ 
            background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)', 
            padding: '1.5rem', 
            borderRadius: 16, 
            border: '2px solid #a7f3d0'
          }}>
            <div className="column-header" style={{ 
              display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' 
            }}>
              <div style={{ 
                width: 12, height: 12, borderRadius: '50%', 
                backgroundColor: TYPE_COLORS['Performance Task'] 
              }}></div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#166534' }}>
                Performance Tasks (50%)
              </h3>
              <span style={{ 
                background: 'rgba(16, 185, 129, 0.1)', 
                color: '#166534', padding: '0.25rem 0.75rem', 
                borderRadius: 20, fontSize: '0.85rem', fontWeight: 500 
              }}>
                {assignmentsByType.performanceTask.length}
              </span>
            </div>
            {assignmentsByType.performanceTask.length > 0 ? (
              <div className="column-grid" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {assignmentsByType.performanceTask.map((assignment) => {
                  const stats = getSubmissionStats(assignment.submissions)
                  return (
                    <div key={assignment.id} className="assignment-card"
                      onClick={() => handleViewAssignment(assignment.id)}
                      style={{ 
                        borderLeft: `4px solid ${TYPE_COLORS[assignment.type] || '#6b7280'}`,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}>
                      <div className="assignment-card-header">
                        <div>
                          <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem' }}>{assignment.title}</h4>
                          <span style={{ marginLeft: 8, fontSize: 12, color: '#9ca3af' }}>
                            {assignment.quarter} · Item {assignment.itemNumber}
                          </span>
                        </div>
                        <button className="btn-delete-assignment" onClick={(e) => handleDeleteAssignment(e, assignment)} title="Delete">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          </svg>
                        </button>
                      </div>
                      <div className="assignment-card-body">
                        <div className="assignment-dates">
                          <div className="assignment-date">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                            </svg>
                            <span>{formatDate(assignment.deadline)}</span>
                          </div>
                        </div>
                        <div style={{ marginTop: 12, padding: '8px 12px', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 8, fontSize: '0.9rem', fontWeight: 600 }}>
                          {stats.done + stats.late}/{stats.total} Completed
                        </div>
                        <div className="assignment-stats" style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', fontSize: '0.85rem' }}>
                          <span style={{ color: '#10b981' }}><strong>{stats.done}</strong> Done</span>
                          <span style={{ color: '#ef4444' }}><strong>{stats.late}</strong> Late</span>
                          <span style={{ color: '#6b7280' }}><strong>{stats.notSubmitted}</strong> Pending</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                </svg>
                <p style={{ marginTop: '0.5rem', fontSize: '1rem' }}>No Performance Tasks yet</p>
                <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>Create the first one for this class</p>
              </div>
            )}
          </div>

          {/* Quarterly Assessment Column */}
          <div className="assignment-column" style={{ 
            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', 
            padding: '1.5rem', 
            borderRadius: 16, 
            border: '2px solid #fcd34d'
          }}>
            <div className="column-header" style={{ 
              display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' 
            }}>
              <div style={{ 
                width: 12, height: 12, borderRadius: '50%', 
                backgroundColor: TYPE_COLORS['Quarterly Assessment'] 
              }}></div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#d97706' }}>
                Quarterly Assessments (20%)
              </h3>
              <span style={{ 
                background: 'rgba(245, 158, 11, 0.1)', 
                color: '#d97706', padding: '0.25rem 0.75rem', 
                borderRadius: 20, fontSize: '0.85rem', fontWeight: 500 
              }}>
                {assignmentsByType.quarterlyAssessment.length}
              </span>
            </div>
            {assignmentsByType.quarterlyAssessment.length > 0 ? (
              <div className="column-grid" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {assignmentsByType.quarterlyAssessment.map((assignment) => {
                  const stats = getSubmissionStats(assignment.submissions)
                  return (
                    <div key={assignment.id} className="assignment-card"
                      onClick={() => handleViewAssignment(assignment.id)}
                      style={{ 
                        borderLeft: `4px solid ${TYPE_COLORS[assignment.type] || '#6b7280'}`,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}>
                      <div className="assignment-card-header">
                        <div>
                          <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem' }}>{assignment.title}</h4>
                          <span style={{ marginLeft: 8, fontSize: 12, color: '#9ca3af' }}>
                            {assignment.quarter} · Item {assignment.itemNumber}
                          </span>
                        </div>
                        <button className="btn-delete-assignment" onClick={(e) => handleDeleteAssignment(e, assignment)} title="Delete">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          </svg>
                        </button>
                      </div>
                      <div className="assignment-card-body">
                        <div className="assignment-dates">
                          <div className="assignment-date">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                            </svg>
                            <span>{formatDate(assignment.deadline)}</span>
                          </div>
                        </div>
                        <div style={{ marginTop: 12, padding: '8px 12px', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 8, fontSize: '0.9rem', fontWeight: 600 }}>
                          {stats.done + stats.late}/{stats.total} Completed
                        </div>
                        <div className="assignment-stats" style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', fontSize: '0.85rem' }}>
                          <span style={{ color: '#10b981' }}><strong>{stats.done}</strong> Done</span>
                          <span style={{ color: '#ef4444' }}><strong>{stats.late}</strong> Late</span>
                          <span style={{ color: '#6b7280' }}><strong>{stats.notSubmitted}</strong> Pending</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#92400e' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 2v20M2 12h20"/>
                </svg>
                <p style={{ marginTop: '0.5rem', fontSize: '1rem' }}>No Quarterly Assessments yet</p>
                <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>Create the first one for this class</p>
              </div>
            )}
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
                <label>Assignment Title *
                  <input type="text" name="title" value={formData.title} onChange={handleInputChange} placeholder="Enter assignment title" required />
                </label>

                <label>Description *
                  <textarea name="description" value={formData.description} onChange={handleInputChange} placeholder="Enter assignment description" rows="3" required />
                </label>

                <label>Class *
                  <select name="classId" value={formData.classId} onChange={handleInputChange} required>
                    <option value="">Select a class</option>
                    {classes.map(cls => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
                  </select>
                </label>

                <label>Assignment Type *
                  <select name="type" value={formData.type} onChange={handleInputChange} required>
                    <option value="Written Works">Written Works (30%)</option>
                    <option value="Performance Task">Performance Task (50%)</option>
                    <option value="Quarterly Assessment">Quarterly Assessment (20%)</option>
                  </select>
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <label>Quarter *
                    <select name="quarter" value={formData.quarter} onChange={handleInputChange} required>
                      <option value="Q1">1st Quarter</option>
                    </select>
                  </label>

                  <label>Possible Score *
                    <input type="number" name="possibleScore" value={formData.possibleScore} onChange={handleInputChange}
                      min="1" max="1000" placeholder="100" required />
                  </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <label>Deadline Date *
                    <input type="date" name="deadlineDate" value={formData.deadlineDate} onChange={handleInputChange} required />
                  </label>
                  <label>Deadline Time *
                    <input type="time" name="deadlineTime" value={formData.deadlineTime} onChange={handleInputChange} required />
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)} disabled={creating}>Cancel</button>
                <button type="submit" className="btn-submit" disabled={creating}>
                  {creating ? 'Creating...' : 'Create Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedAssignment && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>{selectedAssignment.title}</h2>
                <p style={{ fontSize: '0.9rem', color: '#6b7280', marginTop: 4 }}>
                  {selectedAssignment.className} · {selectedAssignment.type} · {selectedAssignment.quarter}
                </p>
              </div>
              <button className="modal-close" onClick={() => setShowDetailModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="assignment-detail-info">
                <div className="info-row"><span className="info-label">Deadline:</span><span>{formatDate(selectedAssignment.deadline)} {formatTime(selectedAssignment.deadline)}</span></div>
                <div className="info-row"><span className="info-label">Possible Score:</span><span>{selectedAssignment.possibleScore}</span></div>
              </div>
              <div style={{ marginTop: 24, marginBottom: 24 }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem' }}>Description</h3>
                <p style={{ color: '#4b5563', lineHeight: 1.6, whiteSpace: 'pre-wrap', backgroundColor: '#f9fafb', padding: 16, borderRadius: 8, margin: 0 }}>
                  {selectedAssignment.description || 'No description provided.'}
                </p>
              </div>
              <div className="students-progress-section">
                <h3>Student Submissions ({selectedAssignment.submissions?.length || 0})</h3>
                <div className="students-list">
                  {selectedAssignment.submissions?.length > 0 ? (
                    selectedAssignment.submissions.map((submission) => (
                      <div key={submission.studentId} className="student-progress-item">
                        <div className="student-info">
                          <div className="student-avatar">{submission.studentName?.charAt(0).toUpperCase()}</div>
                          <div className="student-details">
                            <span className="student-name">{submission.studentName}</span>
                            <span className="student-email">{submission.studentEmail}</span>
                          </div>
                        </div>
                        <div className="submission-info">
                          {getStatusBadge(submission.status)}
                          {submission.score !== null && submission.score !== undefined && (
                            <span style={{ fontWeight: 'bold', color: '#059669', marginLeft: 8 }}>
                              Score: {submission.score}/{selectedAssignment.possibleScore}
                            </span>
                          )}
                          <div className="submission-time">{formatDateTime(submission.submittedAt)}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="no-students">No students enrolled yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      {confirmDialog && (
        <ConfirmDialog title={confirmDialog.title} message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm} onCancel={confirmDialog.onCancel}
          confirmText={confirmDialog.confirmText} type={confirmDialog.type} />
      )}
    </div>
  );
}

export default Assignment;
