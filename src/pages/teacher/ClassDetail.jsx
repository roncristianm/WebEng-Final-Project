import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { auth } from '../../config/firebase'
import { getClassById, getClassStudents } from '../../services/classService'
import { getClassAssignments } from '../../services/assignmentService'
import { getClassAnnouncements, createAnnouncement } from '../../services/announcementService'
import { getClassMaterials, createMaterial, deleteMaterial } from '../../services/materialService'
import { useAuth } from '../../context/AuthContext'
import Notification from '../../components/Notification'
import '../../styles/ClassDetail.css'

function TeacherClassDetail() {
  const { classId } = useParams()
  const navigate = useNavigate()
  const [classData, setClassData] = useState(null)
  const [assignments, setAssignments] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [students, setStudents] = useState([])
  const [materials, setMaterials] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('announcements')
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
      if (postType === 'announcements') {
        if (!formData.title.trim() || !formData.content.trim()) {
          setNotification({ message: 'Please fill title and content', type: 'error' })
          return
        }
        const result = await createAnnouncement({
          title: formData.title.trim(),
          content: formData.content.trim(),
          classId: classId,
          className: classData.name,
          teacherId: currentUser.uid,
          teacherName: currentUser.displayName || 'Teacher'
        })
        if (result.success) {
          setNotification({ message: 'Announcement posted!', type: 'success' })
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
          setNotification({ message: 'Material posted successfully!', type: 'success' })
        } else {
          throw new Error(result.error)
        }
      }
      setFormData({ title: '', content: '', description: '', files: null })
      setShowPostModal(false)
      await loadClassData()
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
      </div>

      {/* Main Content */}
      <div className="class-content-wrapper">
        <div className="class-main-content">
          {activeTab === 'announcements' && (
            <div className="content-section">
              <h2>Announcements ({announcements.length})</h2>
              {announcements.length > 0 ? announcements.map(ann => (
                <div key={ann.id} className="activity-card">
                  <div className="activity-header">
                    <div className="activity-icon">
                      📢
                    </div>
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

          {activeTab === 'materials' && (
            <div className="content-section">
              <h2>Materials ({materials.length})</h2>
              {materials.length > 0 ? materials.map(material => (
                <div key={material.id} className="activity-card">
                  <div className="activity-header">
                    <div className="activity-icon">
                      📚
                    </div>
                    <div>
                      <h3 dangerouslySetInnerHTML={{ __html: linkify(material.description) }} />
                      <small>By {material.teacherName} • {formatDateTime(material.createdAt)}</small>
                    </div>
                    <button className="delete-btn" onClick={() => handleDeleteMaterial(material.id)}>
                      Delete
                    </button>
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
              )) : <div className="empty-state">No materials yet</div>}
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
                      <input
                        value={formData.title}
                        onChange={e => setFormData({...formData, title: e.target.value})}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Content *</label>
                      <textarea
                        value={formData.content}
                        onChange={e => setFormData({...formData, content: e.target.value})}
                        rows="4"
                        required
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="form-group">
                      <label>Description *</label>
                      <textarea
                        value={formData.description}
                        onChange={e => setFormData({...formData, description: e.target.value})}
                        rows="6"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Files *</label>
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.docx,.pptx,.xlsx,.txt,.jpg,.png"
                        onChange={e => setFormData({...formData, files: e.target.files})}
                        required
                      />
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="modal-btn-cancel modal-btn-red"
                  style={{ flex: 1, minWidth: 0, marginRight: '10px' }}
                  onClick={() => setShowPostModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="modal-btn-post"
                  style={{ flex: 1, minWidth: 0 }}
                  disabled={posting}
                >
                  {posting ? 'Posting...' : 'Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

