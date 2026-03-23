import { useState, useEffect, useRef } from 'react'
import { auth } from '../../config/firebase'
import { getTeacherClasses, getClassStudents } from '../../services/classService'
import { 
  createAssignmentSingle as createAssignment, 
  deleteAssignment,
  getAssignmentById,
  getClassAssignments
} from '../../services/assignmentService'
import { sendNewAssignmentNotification } from '../../services/emailService'
import Notification from '../../components/Notification'
import ConfirmDialog from '../../components/ConfirmDialog'
import '../../styles/Assignment.css'

const TYPE_COLORS = {
  'Written Works': '#3b82f6',
  'Performance Task': '#10b981',
  'Quarterly Assessment': '#f59e0b'
}

/* ── Custom Class Selector ─────────────────────────────────────────────────── */
function ClassSelector({ classes, selectedClassId, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const selected = classes.find(c => c.id === selectedClassId)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          padding: '13px 16px',
          fontSize: '15px',
          border: `2px solid ${open ? '#0038A8' : '#e2e8f0'}`,
          borderRadius: 12,
          background: '#fff',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontFamily: 'inherit',
          color: selected ? '#1e293b' : '#9ca3af',
          fontWeight: selected ? 600 : 400,
          boxSizing: 'border-box',
          boxShadow: open ? '0 0 0 3px rgba(0,56,168,0.1)' : 'none',
          transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textAlign: 'left' }}>
          {selected ? selected.name : 'Select a class…'}
        </span>
        <svg
          width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round"
          style={{ flexShrink: 0, marginLeft: 10, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0)' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Dropdown panel — constrained to trigger width */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          left: 0,
          right: 0,         /* same width as trigger */
          background: '#fff',
          border: '1.5px solid #e2e8f0',
          borderRadius: 12,
          boxShadow: '0 8px 28px rgba(0,0,0,0.13)',
          zIndex: 1000,
          maxHeight: 280,
          overflowY: 'auto',
          overflowX: 'hidden',
        }}>
          {classes.length === 0 && (
            <div style={{ padding: '16px', color: '#9ca3af', fontSize: 14, textAlign: 'center' }}>
              No classes found
            </div>
          )}
          {classes.map((cls, i) => {
            const isSelected = cls.id === selectedClassId
            return (
              <button
                key={cls.id}
                type="button"
                onClick={() => { onChange(cls.id); setOpen(false) }}
                style={{
                  width: '100%',
                  padding: '11px 16px',
                  border: 'none',
                  background: isSelected ? '#eff6ff' : 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                  borderBottom: i < classes.length - 1 ? '1px solid #f3f4f6' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  boxSizing: 'border-box',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f8fafc' }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
              >
                <span style={{ fontSize: 14, fontWeight: 700, color: isSelected ? '#0038A8' : '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {isSelected && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0038A8" strokeWidth="3" strokeLinecap="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                  {cls.name}
                </span>
                <span style={{ fontSize: 11, color: '#9ca3af' }}>
                  Grade {cls.grade || '—'} · {cls.section || '—'} · {cls.studentCount || 0} students
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── Main Component ────────────────────────────────────────────────────────── */
function Assignment() {
  const getCurrentDate = () => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
  }
  const getCurrentTime = () => {
    const now = new Date()
    return `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
  }

  const [assignmentsByType, setAssignmentsByType] = useState({ writtenWorks: [], performanceTask: [], quarterlyAssessment: [] })
  const [classes,           setClasses]           = useState([])
  const [loading,           setLoading]           = useState(true)
  const [selectedClassName, setSelectedClassName] = useState('')
  const [selectedClassId,   setSelectedClassId]   = useState('')
  const [showModal,         setShowModal]         = useState(false)
  const [showDetailModal,   setShowDetailModal]   = useState(false)
  const [selectedAssignment,setSelectedAssignment]= useState(null)
  const [notification,      setNotification]      = useState(null)
  const [confirmDialog,     setConfirmDialog]     = useState(null)
  const [creating,          setCreating]          = useState(false)
  const [activeStatusFilter,setActiveStatusFilter]= useState('all')

  const [formData, setFormData] = useState({
    title: '', description: '', classId: '',
    type: 'Written Works', quarter: 'Q1', possibleScore: 100,
    deadlineDate: getCurrentDate(), deadlineTime: getCurrentTime()
  })

  const handleViewAssignment = async (assignmentId) => {
    const full = await getAssignmentById(assignmentId)
    if (full) { setSelectedAssignment(full); setActiveStatusFilter('all'); setShowDetailModal(true) }
  }

  useEffect(() => { loadData() }, [selectedClassId])

  const loadData = async () => {
    setLoading(true)
    if (auth.currentUser) {
      const teacherClasses = await getTeacherClasses(auth.currentUser.uid)
      setClasses(teacherClasses)
      const sel = teacherClasses.find(c => c.id === selectedClassId)
      setSelectedClassName(sel ? sel.name : '')
      if (selectedClassId && sel) {
        const ca = await getClassAssignments(selectedClassId)
        setAssignmentsByType({
          writtenWorks:        ca.filter(a => a.type === 'Written Works'),
          performanceTask:     ca.filter(a => a.type === 'Performance Task'),
          quarterlyAssessment: ca.filter(a => a.type === 'Quarterly Assessment'),
        })
      } else {
        setAssignmentsByType({ writtenWorks: [], performanceTask: [], quarterlyAssessment: [] })
      }
      setLoading(false)
    }
  }

  const handleInputChange = (e) => setFormData(p => ({ ...p, [e.target.name]: e.target.value }))

  const handleCreateAssignment = async (e) => {
    e.preventDefault()
    if (!formData.title || !formData.description || !formData.classId || !formData.possibleScore || !formData.deadlineDate || !formData.deadlineTime) {
      setNotification({ message: 'Please fill in all fields', type: 'error' }); return
    }
    const selectedClass = classes.find(c => c.id === formData.classId)
    const deadline = `${formData.deadlineDate}T${formData.deadlineTime}`
    setCreating(true)
    const result = await createAssignment({
      title: formData.title, description: formData.description, classId: formData.classId,
      className: selectedClass.name, teacherId: auth.currentUser.uid, teacherName: auth.currentUser.displayName,
      type: formData.type, quarter: formData.quarter, possibleScore: parseFloat(formData.possibleScore), deadline,
    })
    setCreating(false)
    if (result.success) {
      setNotification({ message: 'Assignment created!', type: 'success' })
      setShowModal(false)
      setFormData({ title:'', description:'', classId:'', type:'Written Works', quarter:'Q1', possibleScore:100, deadlineDate:getCurrentDate(), deadlineTime:getCurrentTime() })
      try {
        const classStudents = await getClassStudents(formData.classId)
        const emails = classStudents.filter(s => s.email).map(s => s.email)
        const names  = classStudents.filter(s => s.email).map(s => s.name)
        if (emails.length) sendNewAssignmentNotification({ to:emails, studentName:names, teacherName:auth.currentUser.displayName||'Teacher', className:selectedClass.name, title:formData.title, description:formData.description, deadline, type:formData.type, possibleScore:parseFloat(formData.possibleScore) })
      } catch(err) { console.error('Email error:', err.message) }
      loadData()
    } else {
      setNotification({ message: `Error: ${result.error}`, type: 'error' })
    }
  }

  const handleDeleteAssignment = (e, assignment) => {
    e.stopPropagation()
    setConfirmDialog({
      title: 'Delete Assignment', message: `Delete "${assignment.title}"?`,
      onConfirm: async () => {
        setConfirmDialog(null)
        const r = await deleteAssignment(assignment.id)
        if (r.success) { setNotification({ message:'Deleted', type:'success' }); loadData() }
        else setNotification({ message:`Error: ${r.error}`, type:'error' })
      },
      onCancel: () => setConfirmDialog(null), confirmText: 'Delete', type: 'danger',
    })
  }

  const formatDate = (ds) => ds ? new Date(ds).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : 'N/A'
  const formatTime = (ds) => ds ? new Date(ds).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}) : 'N/A'
  const formatDateTime = (ts) => { if (!ts) return 'Not submitted'; const d=ts.toDate?ts.toDate():new Date(ts); return d.toLocaleString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'}) }

  const getStatusBadge = (status) => {
    const b = { done:{text:'Done',color:'#10b981'}, late:{text:'Late',color:'#ef4444'}, not_submitted:{text:'Not Submitted',color:'#6b7280'} }
    const badge = b[status]||b.not_submitted
    return <span style={{padding:'4px 12px',borderRadius:12,fontSize:'0.85rem',fontWeight:500,backgroundColor:`${badge.color}20`,color:badge.color}}>{badge.text}</span>
  }

  const getSubmissionStats = (submissions) => ({
    done:         submissions?.filter(s=>s.status==='done').length||0,
    late:         submissions?.filter(s=>s.status==='late').length||0,
    notSubmitted: submissions?.filter(s=>s.status==='not_submitted').length||0,
    total:        submissions?.length||0,
  })

  const renderColumn = (title, pct, colorKey, items) => {
    const color = TYPE_COLORS[colorKey]
    const configs = {
      'Written Works':        { bg:'linear-gradient(135deg,#eff6ff,#dbeafe)', border:'#bfdbfe', head:'#1e40af', badgeBg:'rgba(59,130,246,.1)' },
      'Performance Task':     { bg:'linear-gradient(135deg,#ecfdf5,#d1fae5)', border:'#a7f3d0', head:'#166534', badgeBg:'rgba(16,185,129,.1)' },
      'Quarterly Assessment': { bg:'linear-gradient(135deg,#fef3c7,#fde68a)', border:'#fcd34d', head:'#d97706', badgeBg:'rgba(245,158,11,.1)' },
    }
    const { bg, border, head, badgeBg } = configs[colorKey]
    return (
      <div style={{ background:bg, padding:'1.25rem', borderRadius:16, border:`2px solid ${border}` }}>
        <div style={{ display:'flex', alignItems:'center', gap:'0.6rem', marginBottom:'1.25rem' }}>
          <div style={{ width:10, height:10, borderRadius:'50%', background:color, flexShrink:0 }} />
          <h3 style={{ margin:0, fontSize:'1rem', fontWeight:700, color:head }}>{title} ({pct}%)</h3>
          <span style={{ background:badgeBg, color:head, padding:'2px 10px', borderRadius:20, fontSize:'0.8rem', fontWeight:600, flexShrink:0 }}>{items.length}</span>
        </div>
        {items.length > 0 ? (
          <div style={{ display:'flex', flexDirection:'column', gap:'0.85rem' }}>
            {items.map(assignment => {
              const stats = getSubmissionStats(assignment.submissions)
              return (
                <div key={assignment.id} className="assignment-card" onClick={()=>handleViewAssignment(assignment.id)} style={{borderLeft:`4px solid ${color}`,cursor:'pointer'}}>
                  <div className="assignment-card-header">
                    <div style={{ minWidth:0, flex:1 }}>
                      <h4 style={{margin:'0 0 2px',fontSize:'0.95rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{assignment.title}</h4>
                      <span style={{fontSize:11,color:'#9ca3af'}}>{assignment.quarter} · Item {assignment.itemNumber}</span>
                    </div>
                    <button className="btn-delete-assignment" onClick={e=>handleDeleteAssignment(e,assignment)}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  </div>
                  <div className="assignment-card-body">
                    <div className="assignment-date" style={{fontSize:12}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg><span>{formatDate(assignment.deadline)}</span></div>
                    <div style={{marginTop:8,padding:'6px 10px',background:'rgba(255,255,255,0.7)',borderRadius:7,fontSize:'0.82rem',fontWeight:600}}>{stats.done+stats.late}/{stats.total} Completed</div>
                    <div style={{marginTop:4,display:'flex',gap:'0.5rem',fontSize:'0.78rem'}}>
                      <span style={{color:'#10b981'}}><strong>{stats.done}</strong> Done</span>
                      <span style={{color:'#ef4444'}}><strong>{stats.late}</strong> Late</span>
                      <span style={{color:'#6b7280'}}><strong>{stats.notSubmitted}</strong> Pending</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{padding:'1.5rem',textAlign:'center',color:'#64748b'}}>
            <p style={{fontSize:'0.9rem'}}>No {colorKey} yet</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="section-header">
        <div>
          <h2>{selectedClassId ? `Assignments - ${selectedClassName}` : 'Assignments'}</h2>
          <p className="page-subtitle">{selectedClassId ? 'Written Works (30%) | Performance Tasks (50%) | Quarterly Assessments (20%)' : 'Select a class to manage assignments'}</p>
        </div>
        <button className="btn-create-assignment" onClick={()=>setShowModal(true)}>+ New Assignment</button>
      </div>

      {/* ── Custom Class Selector ── */}
      <div style={{marginBottom:'2rem',padding:'1.25rem',background:'linear-gradient(135deg,#f8fafc,#f1f5f9)',borderRadius:12,border:'1px solid #e2e8f0'}}>
        <label style={{display:'block',fontWeight:600,marginBottom:'0.6rem',fontSize:'0.95rem',color:'#1e293b'}}>
          Select Class to View Assignments:
        </label>
        <ClassSelector classes={classes} selectedClassId={selectedClassId} onChange={setSelectedClassId} />
        {!selectedClassId && classes.length > 0 && (
          <p style={{marginTop:'0.5rem',color:'#64748b',fontSize:'0.85rem'}}>Choose a class to view its assignments by type</p>
        )}
      </div>

      {loading ? (
        <div className="loading-container"><p>{selectedClassId ? 'Loading...' : 'Loading classes...'}</p></div>
      ) : !selectedClassId ? (
        <div className="empty-state-container">
          <div className="empty-state-card" style={{maxWidth:500}}>
            <h3>Select a Class</h3>
            <p style={{color:'#64748b'}}>Choose a class from the dropdown above to view and manage its assignments.</p>
          </div>
        </div>
      ) : (
        <div className="assignment-columns">
          {renderColumn('Written Works',         30, 'Written Works',        assignmentsByType.writtenWorks)}
          {renderColumn('Performance Tasks',     50, 'Performance Task',     assignmentsByType.performanceTask)}
          {renderColumn('Quarterly Assessments', 20, 'Quarterly Assessment', assignmentsByType.quarterlyAssessment)}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={()=>setShowModal(false)}>
          <div className="modal-content" onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Assignment</h2>
              <button className="modal-close" onClick={()=>setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateAssignment}>
              <div className="modal-body">
                <label>Assignment Title *<input type="text" name="title" value={formData.title} onChange={handleInputChange} placeholder="Enter assignment title" required /></label>
                <label>Description *<textarea name="description" value={formData.description} onChange={handleInputChange} rows="3" required /></label>
                <label>Class *
                  <select name="classId" value={formData.classId} onChange={handleInputChange} required>
                    <option value="">Select a class</option>
                    {classes.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </label>
                <label>Type *
                  <select name="type" value={formData.type} onChange={handleInputChange} required>
                    <option value="Written Works">Written Works (30%)</option>
                    <option value="Performance Task">Performance Task (50%)</option>
                    <option value="Quarterly Assessment">Quarterly Assessment (20%)</option>
                  </select>
                </label>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
                  <label>Quarter *<select name="quarter" value={formData.quarter} onChange={handleInputChange} required><option value="Q1">Q1</option><option value="Q2">Q2</option><option value="Q3">Q3</option><option value="Q4">Q4</option></select></label>
                  <label>Possible Score *<input type="number" name="possibleScore" value={formData.possibleScore} onChange={handleInputChange} min="1" max="1000" required /></label>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
                  <label>Deadline Date *<input type="date" name="deadlineDate" value={formData.deadlineDate} onChange={handleInputChange} required /></label>
                  <label>Deadline Time *<input type="time" name="deadlineTime" value={formData.deadlineTime} onChange={handleInputChange} required /></label>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={()=>setShowModal(false)} disabled={creating}>Cancel</button>
                <button type="submit" className="btn-submit" disabled={creating}>{creating?'Creating...':'Create Assignment'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedAssignment && (
        <div className="modal-overlay" onClick={()=>setShowDetailModal(false)}>
          <div className="modal-content modal-large" onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <div style={{width:'100%',textAlign:'center'}}>
                <h2 style={{margin:0,fontSize:'1.5rem'}}>{selectedAssignment.title}</h2>
                <div style={{marginTop:8,fontSize:'1rem',color:'#374151',fontWeight:500}}>{selectedAssignment.type} | {selectedAssignment.quarter}</div>
              </div>
              <button className="modal-close" onClick={()=>setShowDetailModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="assignment-detail-info">
                <div className="info-row"><span className="info-label">Deadline:</span><span>{formatDate(selectedAssignment.deadline)} {formatTime(selectedAssignment.deadline)}</span></div>
                <div className="info-row"><span className="info-label">Possible Score:</span><span>{selectedAssignment.possibleScore}</span></div>
              </div>
              <div style={{marginTop:20,marginBottom:20}}>
                <h3 style={{margin:'0 0 10px',fontSize:'1rem'}}>Description</h3>
                <p style={{color:'#4b5563',lineHeight:1.6,whiteSpace:'pre-wrap',background:'#f9fafb',padding:14,borderRadius:8,margin:0,fontSize:14}}>
                  {selectedAssignment.description||'No description.'}
                </p>
              </div>
              <div className="students-progress-section">
                <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
                  {['all','done','late','not_submitted'].map(f => {
                    const s=getSubmissionStats(selectedAssignment.submissions)
                    const counts={all:s.total,done:s.done,late:s.late,not_submitted:s.notSubmitted}
                    const labels={all:'All',done:'Completed',late:'Overdue',not_submitted:'Pending'}
                    const colors={all:'#10b981',done:'#10b981',late:'#ef4444',not_submitted:'#6b7280'}
                    const c=colors[f]
                    return <button key={f} style={{padding:'7px 14px',border:`2px solid ${c}30`,background:activeStatusFilter===f?c:'white',color:activeStatusFilter===f?'white':c,borderRadius:8,fontWeight:500,cursor:'pointer',fontSize:'0.85rem'}} onClick={()=>setActiveStatusFilter(f)}>{labels[f]} ({counts[f]})</button>
                  })}
                </div>
                <div className="students-list">
                  {(selectedAssignment.submissions?.filter(s=>activeStatusFilter==='all'||s.status===activeStatusFilter)||[]).length>0
                    ?(selectedAssignment.submissions?.filter(s=>activeStatusFilter==='all'||s.status===activeStatusFilter)||[]).map(sub=>(
                      <div key={sub.studentId} className="student-progress-item">
                        <div className="student-info">
                          <div className="student-avatar">{sub.studentName?.charAt(0).toUpperCase()}</div>
                          <div className="student-details">
                            <span className="student-name">{sub.studentName}</span>
                            <span className="student-email">{sub.studentEmail}</span>
                          </div>
                        </div>
                        <div className="submission-info">
                          {getStatusBadge(sub.status)}
                          {sub.score!=null&&<span style={{fontWeight:'bold',color:'#059669',marginLeft:8,fontSize:13}}>Score: {sub.score}/{selectedAssignment.possibleScore}</span>}
                          <div className="submission-time">{formatDateTime(sub.submittedAt)}</div>
                        </div>
                      </div>
                    ))
                    :<p className="no-students">No students in this category.</p>
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {notification && <Notification message={notification.message} type={notification.type} onClose={()=>setNotification(null)} />}
      {confirmDialog && <ConfirmDialog title={confirmDialog.title} message={confirmDialog.message} onConfirm={confirmDialog.onConfirm} onCancel={confirmDialog.onCancel} confirmText={confirmDialog.confirmText} type={confirmDialog.type} />}
    </div>
  )
}

export default Assignment