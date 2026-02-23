import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { auth } from '../../config/firebase'
import { getClassById, getClassStudents } from '../../services/classService'
import { getClassAssignments } from '../../services/assignmentService'
import { getClassAnnouncements, createAnnouncement } from '../../services/announcementService'
import Notification from '../../components/Notification'
import '../../styles/Dashboard.css'

function TeacherClassDetail() {
  const { classId } = useParams()
  const navigate = useNavigate()
  const [classData, setClassData] = useState(null)
  const [assignments, setAssignments] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('announcements')
  const [notification, setNotification] = useState(null)
  const [showPostModal, setShowPostModal] = useState(false)
  const [announcementTitle, setAnnouncementTitle] = useState('')
  const [announcementContent, setAnnouncementContent] = useState('')
  const [posting, setPosting] = useState(false)

  useEffect(() => {
    loadClassData()
  }, [classId])

  const loadClassData = async () => {
    try {
      const classInfo = await getClassById(classId)
      const classAssignments = await getClassAssignments(classId)
      const classAnnouncements = await getClassAnnouncements(classId)
      const classStudents = await getClassStudents(classId)
      
      setClassData(classInfo)
      setAssignments(classAssignments)
      setAnnouncements(classAnnouncements)
      setStudents(classStudents)
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

  const handlePostAnnouncement = async (e) => {
    e.preventDefault()
    if (!announcementTitle.trim() || !announcementContent.trim()) {
      setNotification({
        message: 'Please fill in both title and content',
        type: 'error'
      })
      return
    }

    setPosting(true)
    const result = await createAnnouncement({
      title: announcementTitle.trim(),
      content: announcementContent.trim(),
      classId: classId,
      className: classData.name,
      teacherId: auth.currentUser.uid,
      teacherName: auth.currentUser.displayName || 'Teacher'
    })

    setPosting(false)
    if (result.success) {
      setNotification({
        message: 'Announcement posted successfully!',
        type: 'success'
      })
      setAnnouncementTitle('')
      setAnnouncementContent('')
      setShowPostModal(false)
      // Reload announcements
      await loadClassData()
    } else {
      setNotification({
        message: `Failed to post announcement: ${result.error}`,
        type: 'error'
      })
    }
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
            <p>The class you're looking for doesn't exist.</p>
            <button 
              className="btn-create-first"
              onClick={() => navigate('/teacher-dashboard/class')}
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
          <p className="class-header-teacher-name">Section: {classData.section}</p>
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
        </div>
      </div>

      {/* Tab Navigation with Post Button */}
      <div className="class-tabs-container">
        <div className="class-tabs-wrapper">
          <button 
            className="post-btn"
            onClick={() => setShowPostModal(true)}
          >
            Post
          </button>
          <div className="class-tabs">
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
              className={`class-tab ${activeTab === 'activities' ? 'active' : ''}`}
              onClick={() => setActiveTab('activities')}
            >
              Activities
            </button>
            <button 
              className={`class-tab ${activeTab === 'people' ? 'active' : ''}`}
              onClick={() => setActiveTab('people')}
            >
              People
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="class-content-wrapper">
        {/* Left Content */}
        <div className="class-main-content">
          {activeTab === 'announcements' && (
            <div className="content-section">
              <h2 className="section-title">Announcements</h2>
              {announcements.length > 0 ? (
                announcements.map(announcement => (
                  <div key={announcement.id} className="activity-card">
                    <div className="activity-header">
                      <div className="activity-icon announcement-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="activity-info">
                        <h3 className="activity-title">{announcement.title}</h3>
                        <p className="activity-meta">{classData.teacherName} • {formatDateTime(announcement.createdAt)}</p>
                      </div>
                    </div>
                    {announcement.content && (
                      <p className="activity-description">{announcement.content}</p>
                    )}
                  </div>
                ))
              ) : (
                <div className="empty-section">
                  <p>No announcements yet</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'activities' && (
            <div className="content-section">
              <h2 className="section-title">Classwork</h2>
              {assignments.length > 0 ? (
                assignments.map(assignment => (
                  <div key={assignment.id} className="activity-card">
                    <div className="activity-header">
                      <div className="activity-icon assignment-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>
                      <div className="activity-info">
                        <h3 className="activity-title">{assignment.title}</h3>
                        <p className="activity-meta">{classData.teacherName} • {formatDateTime(assignment.createdAt)}</p>
                        {assignment.deadline && (
                          <p className={`activity-deadline ${isDeadlinePassed(assignment.deadline) ? 'overdue' : ''}`}>
                            Due: {formatDate(assignment.deadline)} | {formatTime(assignment.deadline)}
                          </p>
                        )}
                      </div>
                    </div>
                    {assignment.description && (
                      <p className="activity-description">{assignment.description}</p>
                    )}
                  </div>
                ))
              ) : (
                <div className="empty-section">
                  <p>No classwork yet</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'materials' && (
            <div className="content-section">
              <h2 className="section-title">Materials</h2>
              <div className="empty-section">
                <p>No materials yet</p>
              </div>
            </div>
          )}

          {activeTab === 'people' && (
            <div className="content-section">
              <div className="people-section">
                {/* Teacher Section */}
                <div className="people-category">
                  <h3 className="people-category-header">Teacher</h3>
                  <div className="people-card">
                    <p className="people-name">Name: {classData.teacherName}</p>
                  </div>
                </div>

                {/* Student Section */}
                <div className="people-category">
                  <h3 className="people-category-header">Student</h3>
                  {students.length > 0 ? (
                    students.map((student) => (
                      <div key={student.id} className="people-card">
                        <p className="people-name">Name: {student.name}</p>
                      </div>
                    ))
                  ) : (
                    <div className="empty-section">
                      <p>No students enrolled yet</p>
                    </div>
                  )}
                </div>
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
                <p>No upcoming work</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Post Announcement Modal */}
      {showPostModal && (
        <div className="modal-overlay" onClick={() => setShowPostModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Post Announcement</h2>
              <button className="modal-close" onClick={() => setShowPostModal(false)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form className="modal-body" onSubmit={handlePostAnnouncement}>
              <div className="form-group">
                <label htmlFor="announcement-title">Title</label>
                <input
                  type="text"
                  id="announcement-title"
                  value={announcementTitle}
                  onChange={(e) => setAnnouncementTitle(e.target.value)}
                  placeholder="Enter announcement title"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="announcement-content">Content</label>
                <textarea
                  id="announcement-content"
                  value={announcementContent}
                  onChange={(e) => setAnnouncementContent(e.target.value)}
                  placeholder="Enter announcement content"
                  rows="6"
                  required
                />
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => setShowPostModal(false)}
                  disabled={posting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-create" 
                  disabled={posting}
                >
                  {posting ? 'Posting...' : 'Post Announcement'}
                </button>
              </div>
            </form>
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

export default TeacherClassDetail
