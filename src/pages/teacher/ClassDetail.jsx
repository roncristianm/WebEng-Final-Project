import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { auth } from '../../config/firebase'
import { getClassById, getClassStudents } from '../../services/classService'
import { getClassAssignments, createAssignmentSingle as createAssignment } from '../../services/assignmentService'
import { getClassAnnouncements, createAnnouncementSingle as createAnnouncement } from '../../services/announcementService'
import { getClassMaterials, createMaterial, deleteMaterial } from '../../services/materialService'
import { sendAnnouncementNotification, sendNewMaterialNotification, sendNewAssignmentNotification } from '../../services/emailService'
import { useAuth } from '../../context/AuthContext'
import Notification from '../../components/Notification'
import ConfirmDialog from '../../components/ConfirmDialog'
import '../../styles/ClassDetail.css'

const TYPE_COLORS = {
  'Written Works':        '#3b82f6',
  'Performance Task':     '#10b981',
  'Quarterly Assessment': '#f59e0b',
}

function TeacherClassDetail() {
  const [showOverdueOnly, setShowOverdueOnly] = useState(false)
  const [studentStatuses, setStudentStatuses] = useState({})
  const { classId } = useParams()
  const navigate    = useNavigate()
  const { currentUser } = useAuth()

  const [classData,     setClassData]     = useState(null)
  const [assignments,   setAssignments]   = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [students,      setStudents]      = useState([])
  const [materials,     setMaterials]     = useState([])
  const [loading,       setLoading]       = useState(true)
  const [activeTab,     setActiveTab]     = useState('general')
  const [notification,  setNotification]  = useState(null)
  const [confirmDialog, setConfirmDialog] = useState(null)
  const [posting,       setPosting]       = useState(false)

  // ── Unified Post Modal ──────────────────────────────────────────────────────
  const [showPostModal, setShowPostModal] = useState(false)
  const [postType,      setPostType]      = useState('announcement')

  const getCurrentDate = () => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
  }
  const getCurrentTime = () => {
    const now = new Date()
    return `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
  }

  const [formData, setFormData] = useState({
    title:               '',
    content:             '',
    description:         '',
    type:                'Written Works',
    quarter:             'Q1',
    possibleScore:       100,
    deadlineDate:        getCurrentDate(),
    deadlineTime:        getCurrentTime(),
    materialDescription: '',
    files:               null,
  })

  const resetForm = () => setFormData({
    title: '', content: '', description: '',
    type: 'Written Works', quarter: 'Q1', possibleScore: 100,
    deadlineDate: getCurrentDate(), deadlineTime: getCurrentTime(),
    materialDescription: '', files: null,
  })

  const openPostModal = () => {
    resetForm()
    setPostType('announcement')
    setShowPostModal(true)
  }

  useEffect(() => { loadClassData() }, [classId])

  const loadClassData = async () => {
    try {
      const [classInfo, classAssignments, classAnnouncements, classStudents, classMaterials] = await Promise.all([
        getClassById(classId),
        getClassAssignments(classId),
        getClassAnnouncements(classId),
        getClassStudents(classId),
        getClassMaterials(classId),
      ])
      setClassData(classInfo)
      setAssignments(classAssignments)
      setAnnouncements(classAnnouncements)
      setStudents(classStudents)
      setMaterials(classMaterials)

      const { getStudentAssignmentStatus } = await import('../../services/studentAssignmentStatus')
      const statuses = {}
      await Promise.all(classStudents.map(async (student) => {
        statuses[student.id] = await getStudentAssignmentStatus(classId, student.id)
      }))
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
    return date.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit' })
  }

  const linkify = (text) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g
    return text.replace(urlRegex, '<a href="$1" target="_blank" class="material-link">$1</a>')
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(classData.classCode)
    setNotification({ message: 'Class code copied to clipboard!', type: 'success' })
  }

  // ── Unified Post Handler ────────────────────────────────────────────────────
  const handleUnifiedPost = async (e) => {
    e.preventDefault()
    setPosting(true)

    try {
      let successMessage = ''
      const studentEmails = students.filter(s => s.email).map(s => s.email)
      const studentNames  = students.filter(s => s.email).map(s => s.name)

      if (postType === 'announcement') {
        if (!formData.title.trim() || !formData.content.trim()) {
          setNotification({ message: 'Please fill title and content', type: 'error' })
          return
        }
        const result = await createAnnouncement({
          title: formData.title.trim(), content: formData.content.trim(),
          classId, className: classData.name,
          teacherId: currentUser.uid, teacherName: currentUser.displayName || 'Teacher',
        })
        if (!result.success) throw new Error(result.error)
        successMessage = 'Announcement posted!'
        if (studentEmails.length > 0) {
          sendAnnouncementNotification({
            to: studentEmails, studentName: studentNames,
            teacherName: currentUser.displayName || 'Teacher',
            className: classData.name, title: formData.title.trim(), content: formData.content.trim(),
          })
        }

      } else if (postType === 'assignment') {
        if (!formData.title.trim() || !formData.description.trim() || !formData.deadlineDate || !formData.deadlineTime) {
          setNotification({ message: 'Please fill all assignment fields', type: 'error' })
          return
        }
        const deadline = `${formData.deadlineDate}T${formData.deadlineTime}`
        const result = await createAssignment({
          title: formData.title.trim(), description: formData.description.trim(),
          classId, className: classData.name,
          teacherId: currentUser.uid, teacherName: currentUser.displayName || 'Teacher',
          type: formData.type, quarter: formData.quarter,
          possibleScore: parseFloat(formData.possibleScore), deadline,
        })
        if (!result.success) throw new Error(result.error)
        successMessage = 'Assignment created!'
        if (studentEmails.length > 0) {
          sendNewAssignmentNotification({
            to: studentEmails, studentName: studentNames,
            teacherName: currentUser.displayName || 'Teacher',
            className: classData.name, title: formData.title.trim(),
            description: formData.description.trim(), deadline,
            type: formData.type, possibleScore: parseFloat(formData.possibleScore),
          })
        }

      } else if (postType === 'material') {
        if (!formData.materialDescription.trim() || !formData.files || formData.files.length === 0) {
          setNotification({ message: 'Please add description and at least one file', type: 'error' })
          return
        }
        const result = await createMaterial(
          classId, formData.materialDescription.trim(),
          formData.files, currentUser.uid, currentUser.displayName
        )
        if (!result.success) throw new Error(result.error)
        successMessage = 'Material posted!'
        if (studentEmails.length > 0) {
          sendNewMaterialNotification({
            to: studentEmails, studentName: studentNames,
            teacherName: currentUser.displayName || 'Teacher',
            className: classData.name, description: formData.materialDescription.trim(),
            fileCount: formData.files.length,
          })
        }
      }

      resetForm()
      setShowPostModal(false)
      await loadClassData()
      setNotification({ message: successMessage, type: 'success' })
    } catch (error) {
      setNotification({ message: error.message, type: 'error' })
    } finally {
      setPosting(false)
    }
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

  if (loading) return <div className="page-container"><div className="loading-container"><p>Loading class...</p></div></div>

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

      {/* Header */}
      <div className="class-detail-header">
        <div className="class-header-content">
          <h1 className="class-detail-title">GRADE {classData.grade}</h1>
          <p className="class-detail-teacher">{classData.name}</p>
          <p className="class-header-teacher-name">Section: {classData.section}</p>
          <div className="class-code-container">
            <span className="class-code-label theme-label">Class Code:</span>
            <code className="class-code-value theme-code">{classData.classCode}</code>
            <button className="copy-code-btn" onClick={handleCopyCode}>Copy</button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="class-tabs-container">
        <div className="class-tabs-wrapper">
          <button
            className="post-btn"
            onClick={openPostModal}
            disabled={activeTab === 'people'}
          >
            + Post
          </button>
          <div className="class-tabs">
            {['general','assignments','announcements','materials','people'].map(tab => (
              <button key={tab} className={`class-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
                {tab === 'people' ? 'Members' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="class-content-wrapper">
        <div className="class-main-content">

          {activeTab === 'general' && (
            <div className="content-section">
              <h2>General</h2>
              {(() => {
                const allItems = [
                  ...announcements.map(a => ({ ...a, itemType:'announcement', date: a.createdAt })),
                  ...materials.map(m => ({ ...m, itemType:'material', title: m.description, content:'', date: m.createdAt })),
                  ...assignments.map(a => ({ ...a, itemType:'assignment', date: a.deadline || a.createdAt })),
                ].filter(i => i.date)
                  .sort((a,b) => (b.date.toMillis?.() ?? new Date(b.date).getTime()) - (a.date.toMillis?.() ?? new Date(a.date).getTime()))

                return allItems.length > 0 ? allItems.map(item => (
                  <div key={item.id} className="activity-card">
                    <div className="activity-header">
                      <div className="activity-icon"></div>
                      <div>
                        <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:1, color:
                          item.itemType==='assignment' ? '#3b82f6' : item.itemType==='material' ? '#10b981' : '#f59e0b' }}>
                          {item.itemType}
                        </span>
                        <h3>{item.title}</h3>
                        <p>{item.content || item.description}</p>
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
                      <span style={{ fontSize:11, fontWeight:700, color: TYPE_COLORS[ass.type] || '#6b7280' }}>{ass.type}</span>
                      <h3>{ass.title}</h3>
                      <p>{ass.description}</p>
                      <small>Due: {formatDateTime(ass.deadline)}</small>
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
                  {material.files?.length > 0 && (
                    <div>
                      <h4>Files ({material.files.length})</h4>
                      {material.files.map((file, i) => (
                        <a key={i} href={file.url} target="_blank" className="file-download">📄 {file.filename}</a>
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
                  style={{marginLeft:'8px',padding:'6px 16px',borderRadius:'8px',border:'1.5px solid #dc2626',
                    background:showOverdueOnly?'#dc2626':'white',color:showOverdueOnly?'white':'#dc2626',fontWeight:600,cursor:'pointer'}}
                  onClick={() => setShowOverdueOnly(v => !v)}
                >
                  Overdue
                </button>
              </div>
              <div style={{marginBottom:'18px',marginTop:'16px'}}>
                <h3 style={{color:'#4f46e5',marginBottom:'8px'}}>Teacher</h3>
                <div className="teacher-card"><strong>{classData.teacherName}</strong> (Teacher)</div>
              </div>
              <div>
                <h3 style={{color:'#4f46e5',marginBottom:'8px'}}>Students</h3>
                {students.length > 0 ? [...students]
                  .sort((a,b) => (a.name||'').localeCompare(b.name||''))
                  .filter(s => !showOverdueOnly || (studentStatuses[s.id]?.overdue ?? 0) > 0)
                  .map(student => (
                    <div key={student.id} className="student-card">
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                        <span>{student.name}</span>
                        <span className="student-assignment-status">
                          Completed: {studentStatuses[student.id]?.completed ?? 0} &nbsp;
                          Overdue: {studentStatuses[student.id]?.overdue ?? 0}
                        </span>
                      </div>
                    </div>
                  )) : <div className="empty-state">No students yet</div>}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── Unified Post Modal ─────────────────────────────────────────────────── */}
      {showPostModal && (
        <div className="modal-overlay" onClick={() => setShowPostModal(false)}>
          <div
            className="modal-content"
            style={{ maxWidth:640, maxHeight:'90vh', overflowY:'auto' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="modal-header">
              <h2>Create Post</h2>
              <button className="close-btn" onClick={() => setShowPostModal(false)}>×</button>
            </div>

            {/* Post type selector tabs */}
            <div style={{ display:'flex', borderBottom:'2px solid #f3f4f6', padding:'0 30px', background:'#fff', flexWrap:'wrap' }}>
              {[
                { key:'announcement', label:'Announcement' },
                { key:'assignment',   label:'📝Assignment'   },
                { key:'material',     label:'📎 Material'     },
              ].map(tab => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setPostType(tab.key)}
                  style={{
                    background:'none', border:'none', padding:'14px 18px',
                    fontWeight:600, fontSize:13, cursor:'pointer',
                    color: postType === tab.key ? '#0038A8' : '#6b7280',
                    borderBottom: postType === tab.key ? '3px solid #0038A8' : '3px solid transparent',
                    marginBottom:'-2px', transition:'all 0.2s', whiteSpace:'nowrap',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleUnifiedPost}>
              <div className="modal-body" style={{ display:'flex', flexDirection:'column', gap:18 }}>

                {/* ── ANNOUNCEMENT FIELDS ── */}
                {postType === 'announcement' && (
                  <>
                    <div className="form-group">
                      <label>Title *</label>
                      <input
                        value={formData.title}
                        onChange={e => setFormData({...formData, title: e.target.value})}
                        placeholder="e.g. No class tomorrow"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Content *</label>
                      <textarea
                        value={formData.content}
                        onChange={e => setFormData({...formData, content: e.target.value})}
                        rows={5}
                        placeholder="What do you want to announce?"
                        required
                      />
                    </div>
                  </>
                )}

                {/* ── ASSIGNMENT FIELDS ── */}
                {postType === 'assignment' && (
                  <>
                    <div className="form-group">
                      <label>Title *</label>
                      <input
                        value={formData.title}
                        onChange={e => setFormData({...formData, title: e.target.value})}
                        placeholder="e.g. Essay on Climate Change"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Instructions *</label>
                      <textarea
                        value={formData.description}
                        onChange={e => setFormData({...formData, description: e.target.value})}
                        rows={3}
                        placeholder="Describe what students need to do"
                        required
                      />
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                      <div className="form-group">
                        <label>Type *</label>
                        <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} required>
                          <option value="Written Works">Written Works (30%)</option>
                          <option value="Performance Task">Performance Task (50%)</option>
                          <option value="Quarterly Assessment">Quarterly Assessment (20%)</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Quarter *</label>
                        <select value={formData.quarter} onChange={e => setFormData({...formData, quarter: e.target.value})} required>
                          <option value="Q1">1st Quarter</option>
                          <option value="Q2">2nd Quarter</option>
                          <option value="Q3">3rd Quarter</option>
                          <option value="Q4">4th Quarter</option>
                        </select>
                      </div>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16 }}>
                      <div className="form-group">
                        <label>Possible Score *</label>
                        <input
                          type="number"
                          value={formData.possibleScore}
                          onChange={e => setFormData({...formData, possibleScore: e.target.value})}
                          min={1} max={1000}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Deadline Date *</label>
                        <input
                          type="date"
                          value={formData.deadlineDate}
                          onChange={e => setFormData({...formData, deadlineDate: e.target.value})}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Time *</label>
                        <input
                          type="time"
                          value={formData.deadlineTime}
                          onChange={e => setFormData({...formData, deadlineTime: e.target.value})}
                          required
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* ── MATERIAL FIELDS ── */}
                {postType === 'material' && (
                  <>
                    <div className="form-group">
                      <label>Description *</label>
                      <textarea
                        value={formData.materialDescription}
                        onChange={e => setFormData({...formData, materialDescription: e.target.value})}
                        rows={4}
                        placeholder="Describe the material. You can paste links here too."
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
                      <small style={{ color:'#9ca3af', marginTop:4, display:'block' }}>
                        Accepted: PDF, Word, PowerPoint, Excel, TXT, JPG, PNG
                      </small>
                    </div>
                  </>
                )}

              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="modal-btn-cancel"
                  style={{ flex:1, minWidth:0, marginRight:10 }}
                  onClick={() => setShowPostModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="modal-btn-post"
                  style={{ flex:1, minWidth:0 }}
                  disabled={posting}
                >
                  {posting ? 'Posting...' : `Post ${postType.charAt(0).toUpperCase() + postType.slice(1)}`}
                </button>
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
          title={confirmDialog.title} message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm} onCancel={confirmDialog.onCancel}
          confirmText={confirmDialog.confirmText} type={confirmDialog.type}
        />
      )}
    </div>
  )
}

export default TeacherClassDetail