import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { auth } from '../../config/firebase'
import { getClassById, leaveClass, getClassStudents } from '../../services/classService'
import { getClassAssignments } from '../../services/assignmentService'
import { getClassAnnouncements } from '../../services/announcementService'
import Notification from '../../components/Notification'
import ConfirmDialog from '../../components/ConfirmDialog'
import { getClassMaterials } from '../../services/materialService'
import '../../styles/ClassDetail.css'

function ClassDetail() {
  const { classId } = useParams()
  const navigate = useNavigate()
  const [classData, setClassData] = useState(null)
  const [assignments, setAssignments] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('general')
  const [notification, setNotification] = useState(null)
  const [confirmDialog, setConfirmDialog] = useState(null)
  const [materials, setMaterials] = useState([])

  useEffect(() => {
    loadClassData()
  }, [classId])

  const loadClassData = async () => {
    try {
      const classInfo = await getClassById(classId)
      const classAssignments = await getClassAssignments(classId)
      const classAnnouncements = await getClassAnnouncements(classId)
      const classStudents = await getClassStudents(classId)
      const classMaterials = await getClassMaterials(classId)
      
      setClassData(classInfo)
      setAssignments(classAssignments)
      setAnnouncements(classAnnouncements)
      setStudents(classStudents)
      setMaterials(classMaterials)
      setLoading(false)
    } catch (error) {
      console.error('Error loading class data:', error)
      setLoading(false)
    }
  }

const formatDateTime = (timestamp) => {
    if (!timestamp) return ''
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    const options = { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }
    return date.toLocaleDateString('en-US', options)
  }

  // Linkify text
  const linkify = (text) => {
    const urlRegex = /https?:\/\/[^\s<>"']+/gi
    return text ? text.replace(urlRegex, '<a href="$1" target="_blank" class="material-link">$1</a>') : ''
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return 'No deadline'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    const options = { month: 'short', day: 'numeric', year: 'numeric' }
    return date.toLocaleDateString('en-US', options)
  }

  const formatTime = (timestamp) => {
    if (!timestamp) return ''
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    const options = { 
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }
    return date.toLocaleTimeString('en-US', options)
  }

  const isDeadlinePassed = (deadline) => {
    if (!deadline) return false
    const deadlineDate = deadline.toDate ? deadline.toDate() : new Date(deadline)
    return deadlineDate < new Date()
  }

  const handleLeaveClass = () => {
    setConfirmDialog({
      title: 'Leave Class',
      message: `Are you sure you want to leave "${classData.name}"? You will need a new class code to rejoin.`,
      onConfirm: async () => {
        setConfirmDialog(null)
        const result = await leaveClass(classId, auth.currentUser.uid)
        if (result.success) {
          setNotification({
            message: `Successfully left "${classData.name}"`,
            type: 'success'
          })
          setTimeout(() => {
            navigate('/dashboard/class')
          }, 1500)
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

  const getUpcomingAssignments = () => {
    const now = new Date()
    return assignments
      .filter(assignment => {
        if (!assignment.deadline) return false
        const deadline = assignment.deadline.toDate ? assignment.deadline.toDate() : new Date(assignment.deadline)
        return deadline > now
      })
      .sort((a, b) => {
        const aDate = a.deadline.toDate ? a.deadline.toDate() : new Date(a.deadline)
        const bDate = b.deadline.toDate ? b.deadline.toDate() : new Date(b.deadline)
        return aDate - bDate
      })
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(classData.classCode)
    setNotification({
      message: 'Class code copied to clipboard!',
      type: 'success'
    })
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-container">
          <p>Loading class...</p>
        </div>
      </div>
    )
  }

  if (!classData) {
    return (
      <div className="page-container">
        <div className="empty-state-container">
          <div className="empty-state-card">
            <h3>Class Not Found</h3>
            <p>The class you're looking for doesn't exist or you don't have access to it.</p>
            <button 
              className="btn-create-first"
              onClick={() => navigate('/dashboard/class')}
            >
              Back to Classes
            </button>
          </div>
        </div>
      </div>
    )
  }

  const upcomingAssignments = getUpcomingAssignments()

  return (
    <div className="class-detail-container">
      {/* Gradient Header */}
      <div className="class-detail-header">
        <div className="class-header-content">
          <h1 className="class-detail-title">GRADE {classData.grade}</h1>
          <p className="class-detail-teacher">{classData.name}</p>
          <p className="class-header-teacher-name">Teacher: {classData.teacherName}</p>
          <div className="class-code-container">
            <span className="class-code-label">Class Code:</span>
            <code className="class-code-value">{classData.classCode}</code>
            <button className="copy-code-btn" onClick={handleCopyCode} title="Copy code">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </button>
          </div>
        </div>
        <div className="class-header-actions">
          <div className="class-pic-placeholder">Pic</div>
          <button className="leave-class-btn" onClick={handleLeaveClass}>
            Leave Class
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="class-tabs-container">
        <div className="class-tabs">
          <button 
            className={`class-tab ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            General
          </button>
          <button 
            className={`class-tab ${activeTab === 'assignments' ? 'active' : ''}`}
            onClick={() => setActiveTab('assignments')}
          >
            Assignments
          </button>
          <button 
            className={`class-tab ${activeTab === 'announcements' ? 'active' : ''}`}
            onClick={() => setActiveTab('announcements')}
          >
            Announcements
          </button>
          <button 
            className={`class-tab ${activeTab === 'materials' ? 'active' : ''}`}
            onClick={() => setActiveTab('materials')}
          >
            Materials
          </button>
          <button 
            className={`class-tab ${activeTab === 'people' ? 'active' : ''}`}
            onClick={() => setActiveTab('people')}
          >
            People
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="class-content-wrapper">
        {/* Left Content */}
        <div className="class-main-content">
          {activeTab === 'general' && (
            <div className="content-section">
              <h2>General</h2>
              {(() => {
                const allItems = [
                  ...announcements.map(ann => ({...ann, itemType: 'announcement', date: ann.createdAt})),
                  ...materials.map(mat => ({...mat, itemType: 'material', date: mat.createdAt})),
                  ...assignments.map(ass => ({...ass, itemType: 'assignment', date: ass.createdAt || ass.deadline}))
                ].filter(item => item.date)
                 .sort((a, b) => (b.date.toMillis ? b.date.toMillis() : new Date(b.date).getTime()) - (a.date.toMillis ? a.date.toMillis() : new Date(a.date).getTime()));
                return allItems.length > 0 ? allItems.map(item => (
                  <div key={item.id} className="activity-card">
                    <div className="activity-header">
                      <div>
                        <h3>{item.title || item.description}</h3>
                        <p>{item.content || item.description || 'No description'}</p>
                        {item.itemType === 'assignment' && item.deadline && (
                          <small>Due {formatDate(item.deadline)} • {item.type || 'Assignment'}</small>
                        )}
                        <small>
                          {item.teacherName ? `By ${item.teacherName}` : ''}
                          {item.teacherName && item.date ? ' • ' : ''} 
                          {formatDateTime(item.date)}
                        </small>
                        {item.itemType === 'material' && item.files && item.files.length > 0 && (
                          <div>
                            <h4>Files ({item.files.length})</h4>
                            {item.files.map((file, index) => (
                              <a key={index} href={file.url} target="_blank" className="file-download">
                                📄 {file.filename}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )) : <div className="empty-state">No announcements, materials, or assignments yet</div>
              })()}
            </div>
          )}
          {activeTab === 'assignments' && (
            <div className="content-section">
              <h2>Assignments</h2>
              {assignments.length > 0 ? assignments.map(assignment => (
                <div key={assignment.id} className="activity-card">
                  <div className="activity-header">
                    <div>
                      <h3>{assignment.title}</h3>
                      <p>{assignment.description || 'No description provided'}</p>
                      <small>By {assignment.teacherName} • Due {formatDate(assignment.deadline)} • {assignment.type}</small>
                    </div>
                  </div>
                </div>
              )) : <div className="empty-state">No assignments yet</div>}
            </div>
          )}
          {activeTab === 'announcements' && (
            <div className="content-section">
              <h2>Announcements</h2>
              {announcements.length > 0 ? (
                announcements.map(ann => (
                  <div key={ann.id} className="activity-card">
                    <div className="activity-header">
                      <div>
                        <h3>{ann.title}</h3>
                        <p>{ann.content}</p>
                        <small>By {ann.teacherName} • {formatDateTime(ann.createdAt)}</small>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">No announcements yet</div>
              )}
            </div>
          )}

          {activeTab === 'materials' && (
            <div className="content-section">
              <h2>Materials</h2>
              {materials.length > 0 ? (
                materials.map(material => (
                  <div key={material.id} className="activity-card">
                    <div className="activity-header">
                      <div>
                        <h3 dangerouslySetInnerHTML={{ __html: linkify(material.description) }} />
                        <small>By {material.teacherName} • {formatDateTime(material.createdAt)}</small>
                      </div>
                    </div>
                    {material.files && material.files.length > 0 && (
                      <div>
                        <h4>Files ({material.files.length})</h4>
                        {material.files.map((file, index) => (
                          <a key={index} href={file.url} target="_blank" className="file-download">
                            📄 {file.filename}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="empty-state">No materials yet</div>
              )}
            </div>
          )}

{activeTab === 'people' && (
            <div className="content-section">
              <h2>People ({students.length + 1})</h2>
              <div style={{marginBottom: '18px'}}>
                <h3 style={{color: '#4f46e5', marginBottom: '8px'}}>Teacher</h3>
                <div className="teacher-card">
                  <strong>{classData.teacherName}</strong> (Teacher)
                </div>
              </div>
              <div>
                <h3 style={{color: '#4f46e5', marginBottom: '8px'}}>Students</h3>
                {students.length > 0 ? students.map(student => (
                  <div key={student.id} className="student-card">
                    {student.name}
                  </div>
                )) : <div className="empty-state">No students yet</div>}
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar - Upcoming */}
        <div className="class-sidebar">
          <div className="upcoming-section">
            <h3 className="upcoming-title">Upcoming</h3>
            {upcomingAssignments.length > 0 ? (
              <div className="upcoming-list">
                {upcomingAssignments.map(assignment => (
                  <div key={assignment.id} className="upcoming-item">
                    <div className="upcoming-item-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <div className="upcoming-item-content">
                      <p className="upcoming-item-title">{assignment.title}</p>
                      <p className={`upcoming-item-date ${isDeadlinePassed(assignment.deadline) ? 'overdue' : ''}`}>
                        Due: {formatDate(assignment.deadline)} | {formatTime(assignment.deadline)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="upcoming-empty">
                <p>Woohoo, no work due soon!</p>
              </div>
            )}
          </div>
        </div>
      </div>

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

export default ClassDetail
