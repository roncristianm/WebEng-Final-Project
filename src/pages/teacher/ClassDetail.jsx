import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { auth } from '../../config/firebase'
import { getClassById, getClassStudents } from '../../services/classService'
import { getClassAssignments } from '../../services/assignmentService'
import { getClassAnnouncements, createAnnouncementSingle as createAnnouncement } from '../../services/announcementService'
import { getClassMaterials, createMaterial, deleteMaterial } from '../../services/materialService'
import { sendAnnouncementNotification, sendNewMaterialNotification } from '../../services/emailService'
import { useAuth } from '../../context/AuthContext'
import Notification from '../../components/Notification'
import ConfirmDialog from '../../components/ConfirmDialog'
import '../../styles/ClassDetail.css'

function TeacherClassDetail() {
  const [showOverdueOnly, setShowOverdueOnly] = useState(false)
  const [studentStatuses, setStudentStatuses] = useState({})
  const { classId } = useParams()
  const navigate = useNavigate()
  const [classData, setClassData] = useState(null)
  const [assignments, setAssignments] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [students, setStudents] = useState([])
  const [materials, setMaterials] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('general')
  const [notification, setNotification] = useState(null)
  const [showPostModal, setShowPostModal] = useState(false)
  const [postType, setPostType] = useState('announcements')
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    description: '',
    files: null
  })
  const [posting, setPosting] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState(null)
  const { currentUser } = useAuth()

  useEffect(() => {
    loadClassData()
  }, [classId])

  const loadClassData = async () => {
    try {
      const [classInfo, classAssignments, classAnnouncements, classStudents, classMaterials] = await Promise.all([
        getClassById(classId),
        getClassAssignments(classId),
        getClassAnnouncements(classId),
        getClassStudents(classId),
        getClassMaterials(classId)
      ])
      
      setClassData(classInfo)
      setAssignments(classAssignments)
      setAnnouncements(classAnnouncements)
      setStudents(classStudents)
      setMaterials(classMaterials)

      const { getStudentAssignmentStatus } = await import('../../services/studentAssignmentStatus')
      const statuses = {}
      await Promise.all(
        classStudents.map(async (student) => {
          statuses[student.id] = await getStudentAssignmentStatus(classId, student.id)
        })
      )
      setStudentStatuses(statuses)
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

  const linkify = (text) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g
    return text.replace(urlRegex, '<a href="$1" target="_blank" class="material-link">$1</a>')
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(classData.classCode)
    setNotification({
      message: 'Class code copied to clipboard!',
      type: 'success'
    })
  }

  const handleUnifiedPost = async (e) => {
    e.preventDefault()
    setPosting(true)

    try {
      let successMessage = ''

      if (postType === 'announcements') {
        if (!formData.title.trim() || !formData.content.trim()) {
          setNotification({ message: 'Please fill title and content', type: 'error' })
          return
        }
        const result = await createAnnouncement({
          title:       formData.title.trim(),
          content:     formData.content.trim(),
          classId:     classId,
          className:   classData.name,
          teacherId:   currentUser.uid,
          teacherName: currentUser.displayName || 'Teacher'
        })
        if (result.success) {
          successMessage = 'Announcement posted!'

          // Send email notification to all students (non-blocking)
          const studentEmails = students.filter(s => s.email).map(s => s.email)
          const studentNames  = students.filter(s => s.email).map(s => s.name)
          if (studentEmails.length > 0) {
            sendAnnouncementNotification({
              to:          studentEmails,
              studentName: studentNames,
              teacherName: currentUser.displayName || 'Teacher',
              className:   classData.name,
              title:       formData.title.trim(),
              content:     formData.content.trim(),
            })
          }
        } else {
          throw new Error(result.error)
        }
      } else if (postType === 'materials') {
        if (!formData.description.trim() || (!formData.files || formData.files.length === 0)) {
          setNotification({ message: 'Please add description and at least one file', type: 'error' })
          return
        }
        const result = await createMaterial(
          classId,
          formData.description.trim(),
          formData.files,
          currentUser.uid,
          currentUser.displayName
        )
        if (result.success) {
          successMessage = 'Material posted successfully!'

          // Send email notification to all students (non-blocking)
          const studentEmails = students.filter(s => s.email).map(s => s.email)
          const studentNames  = students.filter(s => s.email).map(s => s.name)
          if (studentEmails.length > 0) {
            sendNewMaterialNotification({
              to:          studentEmails,
              studentName: studentNames,
              teacherName: currentUser.displayName || 'Teacher',
              className:   classData.name,
              description: formData.description.trim(),
              fileCount:   formData.files.length,
            })
          }
        } else {
          throw new Error(result.error)
        }
      }

      // Close modal and reload first, THEN show notification so it isn't lost
      setFormData({ title: '', content: '', description: '', files: null })
      setShowPostModal(false)
      await loadClassData()
      setNotification({ message: successMessage, type: 'success' })
    } catch (error) {
      setNotification({ message: error.message, type: 'error' })
    } finally {
      setPosting(false)
    }
  }

  const openPostModal = () => {
    setPostType(activeTab)
    setFormData({ title: '', content: '', description: '', files: null })
    setShowPostModal(true)
  }

  const handleDeleteMaterial = async (materialId) => {
    const result = await deleteMaterial(materialId)
    if (result.success) {
      setNotification({ message: 'Material deleted!', type: 'success' })
      await loadClassData()
    } else {
      setNotification({ message: `Error: ${result.error}`, type: 'error' })
    }
  }

  const handleDeleteClass = () => {
    setConfirmDialog({
      title: 'Delete Class',
      message: `Are you sure you want to delete "${classData.name}"? This action cannot be undone and all students, assignments, and materials will be permanently removed.`,
      onConfirm: () => {
        (async () => {
          console.log('DeleteClass: Dialog confirmed, classId:', classId)
          setConfirmDialog(null)
          const result = await deleteClass(classId)
          console.log('DeleteClass: Result:', result)
          if (result.success) {
            setNotification({
              message: `Class "${classData.name}" deleted successfully`,
              type: 'success'
            })
            navigate('/teacher-dashboard/class')
          } else {
            setNotification({
              message: `Failed to delete class: ${result.error}`,
              type: 'error'
            })
          }
        })()
      },
      onCancel: () => setConfirmDialog(null),
      confirmText: 'Delete Class',
      type: 'danger'
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
            <button onClick={() => navigate('/teacher-dashboard/class')}>Back to Classes</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="class-detail-container">
      {/* Gradient Header */}
      <div className="class-detail-header">
        <div className="class-header-content">
          <h1 className="class-detail-title">GRADE {classData.grade}</h1>
          <p className="class-detail-teacher">{classData.name}</p>
          <p className="class-header-teacher-name">Section: {classData.section}</p>
          <div className="class-code-container">
            <span className="class-code-label theme-label">Class Code:</span>
            <code className="class-code-value theme-code">{classData.classCode}</code>
            <button className="copy-code-btn" onClick={handleCopyCode}>
              Copy
            </button>
          </div>
        </div>
        <div className="class-pic-placeholder">Pic</div>
      </div>

      {/* Tab Navigation */}
      <div className="class-tabs-container">
        <div className="class-tabs-wrapper">
          <button 
            className="post-btn"
            onClick={openPostModal}
            disabled={['activities', 'people'].includes(activeTab)}
          >
            Post
          </button>

          <div className="class-tabs">
            <button className={`class-tab ${activeTab === 'general' ? 'active' : ''}`} onClick={() => setActiveTab('general')}>General</button>
            <button className={`class-tab ${activeTab === 'assignments' ? 'active' : ''}`} onClick={() => setActiveTab('assignments')}>Assignments</button>
            <button className={`class-tab ${activeTab === 'announcements' ? 'active' : ''}`} onClick={() => setActiveTab('announcements')}>Announcements</button>
            <button className={`class-tab ${activeTab === 'materials' ? 'active' : ''}`} onClick={() => setActiveTab('materials')}>Materials</button>
            <button className={`class-tab ${activeTab === 'people' ? 'active' : ''}`} onClick={() => setActiveTab('people')}>Members</button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="class-content-wrapper">
        <div className="class-main-content">
          {activeTab === 'general' && (
            <div className="content-section">
              <h2>General</h2>
              {(() => {
                const allItems = [
                  ...announcements.map(ann => ({ ...ann, itemType: 'announcement', title: ann.title, content: ann.content, date: ann.createdAt })),
                  ...materials.map(mat => ({ ...mat, itemType: 'material', title: mat.description, content: '', date: mat.createdAt })),
                  ...assignments.map(ass => ({ ...ass, itemType: 'assignment', title: ass.title, content: ass.description, date: ass.deadline || ass.createdAt }))
                ].filter(item => item.date)
                  .sort((a, b) => (b.date.toMillis ? b.date.toMillis() : new Date(b.date).getTime()) - (a.date.toMillis ? a.date.toMillis() : new Date(a.date).getTime()))
                return allItems.length > 0 ? allItems.map(item => (
                  <div key={item.id} className="activity-card">
                    <div className="activity-header">
                      <div className="activity-icon"></div>
                      <div>
                        <h3>{item.title}</h3>
                        <p>{item.content}</p>
                        <small>{formatDateTime(item.date)}</small>
                      </div>
                    </div>
                  </div>
                )) : <div className="empty-state">No items yet</div>
              })()}
            </div>
          )}

          {activeTab === 'announcements' && (
            <div className="content-section">
              <h2>Announcements</h2>
              {announcements.length > 0 ? announcements.map(ann => (
                <div key={ann.id} className="activity-card">
                  <div className="activity-header">
                    <div className="activity-icon"></div>
                    <div>
                      <h3>{ann.title}</h3>
                      <p>{ann.content}</p>
                      <small>{formatDateTime(ann.createdAt)}</small>
                    </div>
                  </div>
                </div>
              )) : <div className="empty-state">No announcements yet</div>}
            </div>
          )}

          {activeTab === 'assignments' && (
            <div className="content-section">
              <h2>Assignments</h2>
              {assignments.length > 0 ? assignments.map(ass => (
                <div key={ass.id} className="activity-card">
                  <div className="activity-header">
                    <div className="activity-icon"></div>
                    <div>
                      <h3>{ass.title}</h3>
                      <p>{ass.description}</p>
                      <small>{formatDateTime(ass.deadline || ass.createdAt)}</small>
                    </div>
                  </div>
                </div>
              )) : <div className="empty-state">No assignments yet</div>}
            </div>
          )}

          {activeTab === 'materials' && (
            <div className="content-section">
              <h2>Materials</h2>
              {materials.length > 0 ? materials.map(material => (
                <div key={material.id} className="activity-card">
                  <div className="activity-header">
                    <div className="activity-icon"></div>
                    <div>
                      <h3 dangerouslySetInnerHTML={{ __html: linkify(material.description) }} />
                      <small>By {material.teacherName} • {formatDateTime(material.createdAt)}</small>
                    </div>
                    <button className="delete-btn" onClick={() => handleDeleteMaterial(material.id)}>Delete</button>
                  </div>
                  {material.files && material.files.length > 0 && (
                    <div>
                      <h4>Files ({material.files.length})</h4>
                      {material.files.map((file, index) => (
                        <a key={index} href={file.url} target="_blank" className="file-download">📄 {file.filename}</a>
                      ))}
                    </div>
                  )}
                </div>
              )) : <div className="empty-state">No materials yet</div>}
            </div>
          )}

          {activeTab === 'people' && (
            <div className="content-section">
              <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                <h2 style={{marginBottom:0}}>Members ({students.length + 1})</h2>
                <button
                  className={showOverdueOnly ? 'overdue-toggle-btn active' : 'overdue-toggle-btn'}
                  style={{marginLeft:'8px',padding:'6px 16px',borderRadius:'8px',border:'1.5px solid #dc2626',background:showOverdueOnly ? '#dc2626' : 'white',color:showOverdueOnly ? 'white' : '#dc2626',fontWeight:600,cursor:'pointer'}}
                  onClick={() => setShowOverdueOnly(v => !v)}
                >
                  Overdue
                </button>
              </div>
              <div style={{marginBottom: '18px'}}>
                <h3 style={{color: '#4f46e5', marginBottom: '8px'}}>Teacher</h3>
                <div className="teacher-card">
                  <strong>{classData.teacherName}</strong> (Teacher)
                </div>
              </div>
              <div>
                <h3 style={{color: '#4f46e5', marginBottom: '8px'}}>Students</h3>
                {students.length > 0 ? [...students]
                  .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                  .filter(student => !showOverdueOnly || (studentStatuses[student.id]?.overdue ?? 0) > 0)
                  .map(student => (
                    <div key={student.id} className="student-card">
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                        <span>{student.name}</span>
                        <span className="student-assignment-status">
                          Completed: {studentStatuses[student.id]?.completed ?? 0} Overdue: {studentStatuses[student.id]?.overdue ?? 0}
                        </span>
                      </div>
                    </div>
                  )) : <div className="empty-state">No students yet</div>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Post Modal */}
      {showPostModal && (
        <div className="modal-overlay" onClick={() => setShowPostModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Post {postType === 'materials' ? 'Material' : 'Announcement'}</h2>
              <button className="close-btn" onClick={() => setShowPostModal(false)}>×</button>
            </div>
            <form onSubmit={handleUnifiedPost}>
              <div className="modal-body" style={{display: 'flex', flexDirection: 'column', gap: '18px', alignItems: 'stretch'}}>
                {postType === 'announcements' ? (
                  <>
                    <div className="form-group">
                      <label>Title *</label>
                      <input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
                    </div>
                    <div className="form-group">
                      <label>Content *</label>
                      <textarea value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} rows="4" required />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="form-group">
                      <label>Description *</label>
                      <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows="6" required />
                    </div>
                    <div className="form-group">
                      <label>Files *</label>
                      <input type="file" multiple accept=".pdf,.docx,.pptx,.xlsx,.txt,.jpg,.png" onChange={e => setFormData({...formData, files: e.target.files})} required />
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="modal-btn-cancel modal-btn-red" style={{ flex: 1, minWidth: 0, marginRight: '10px' }} onClick={() => setShowPostModal(false)}>Cancel</button>
                <button type="submit" className="modal-btn-post" style={{ flex: 1, minWidth: 0 }} disabled={posting}>{posting ? 'Posting...' : 'Post'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {notification && (
        <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />
      )}

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

export default TeacherClassDetail
