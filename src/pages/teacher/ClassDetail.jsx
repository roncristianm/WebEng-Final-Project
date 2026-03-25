import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { auth } from '../../config/firebase'
import { getClassById, getClassStudents, deleteClass } from '../../services/classService'
import { getClassAssignments, createAssignmentSingle, getAssignmentById } from '../../services/assignmentService'
import { getClassAnnouncements, createAnnouncementSingle as createAnnouncement } from '../../services/announcementService'
import { getClassMaterials, createMaterial, deleteMaterial } from '../../services/materialService'
import { useAuth } from '../../context/AuthContext'
import Notification from '../../components/Notification'
import ConfirmDialog from '../../components/ConfirmDialog'
import '../../styles/TeacherClassDetail.css'

/* ── SVG Icon set ── */
const Icons = {
  general: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  ),
  assignments: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
  announcements: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  ),
  materials: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
    </svg>
  ),
  people: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  back: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  ),
  teacher: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  copy: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
  ),
  check: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  plus: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  trash: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    </svg>
  ),
  calendar: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  alert: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
  close: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  empty: (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
}

const TYPE_COLORS = {
  'Written Works': '#3b82f6',
  'Performance Task': '#10b981',
  'Quarterly Assessment': '#f59e0b'
}

const TABS = ['general', 'assignments', 'announcements', 'materials', 'people']
const TAB_LABELS = {
  general: 'General', assignments: 'Assignments',
  announcements: 'Announcements', materials: 'Materials', people: 'Members',
}

function fmt(ts) {
  if (!ts) return ''
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}
function fmtDate(ts) {
  if (!ts) return ''
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function fmtTime(ts) {
  if (!ts) return ''
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}
function isOD(dl) {
  if (!dl) return false
  const d = dl.toDate ? dl.toDate() : new Date(dl)
  return d < new Date()
}
function linkify(t = '') {
  return t.replace(/https?:\/\/[^\s<>"']+/gi, u => `<a href="${u}" target="_blank" rel="noopener" class="tcd-link">${u}</a>`)
}

function TypeChip({ type }) {
  const m = { announcement: ['Announcement','tcd-chip--ann'], assignment: ['Assignment','tcd-chip--asgn'], material: ['Material','tcd-chip--mat'] }
  const [label, cls] = m[type] || []
  return <span className={`tcd-chip ${cls}`}>{label}</span>
}

function FeedCard({ title, meta, chip, overdue, onDelete, onClick, children }) {
  return (
    <div
      className={`tcd-feed-card ${overdue ? 'tcd-feed-card--overdue' : ''}`}
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : {}}
    >
      <div className="tcd-feed-top">
        <div className="tcd-feed-main">
          {chip && <TypeChip type={chip} />}
          <h3 className="tcd-feed-title">{title}</h3>
        </div>
        <div className="tcd-feed-right">
          {meta && <span className="tcd-feed-meta">{meta}</span>}
          {onClick && (
            <span style={{ fontSize: 11, color: '#0038A8', fontWeight: 700, background: '#eff6ff', borderRadius: 6, padding: '2px 8px', whiteSpace: 'nowrap' }}>
              View →
            </span>
          )}
          {onDelete && (
            <button
              className="tcd-icon-btn tcd-icon-btn--danger"
              onClick={e => { e.stopPropagation(); onDelete() }}
              title="Delete"
            >
              {Icons.trash}
            </button>
          )}
        </div>
      </div>
      {children && <div className="tcd-feed-body">{children}</div>}
    </div>
  )
}

/* ── New-item picker ── */
function NewPicker({ onPick, onClose }) {
  return (
    <div className="tcd-picker-backdrop" onClick={onClose}>
      <div className="tcd-picker" onClick={e => e.stopPropagation()}>
        <p className="tcd-picker-label">What would you like to create?</p>
        <button className="tcd-picker-item" onClick={() => onPick('assignments')}>
          <span className="tcd-picker-icon tcd-picker-icon--asgn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </span>
          <div>
            <p className="tcd-picker-name">Assignment</p>
            <p className="tcd-picker-desc">Set a graded task with a deadline</p>
          </div>
        </button>
        <button className="tcd-picker-item" onClick={() => onPick('announcements')}>
          <span className="tcd-picker-icon tcd-picker-icon--ann">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </span>
          <div>
            <p className="tcd-picker-name">Announcement</p>
            <p className="tcd-picker-desc">Share a message with your class</p>
          </div>
        </button>
        <button className="tcd-picker-item" onClick={() => onPick('materials')}>
          <span className="tcd-picker-icon tcd-picker-icon--mat">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
            </svg>
          </span>
          <div>
            <p className="tcd-picker-name">Material</p>
            <p className="tcd-picker-desc">Upload files or share links</p>
          </div>
        </button>
      </div>
    </div>
  )
}

function PostModal({ postType, formData, setFormData, posting, onClose, onSubmit }) {
  const isAnn  = postType === 'announcements'
  const isAsgn = postType === 'assignments'
  const title  = isAnn ? 'New Announcement' : isAsgn ? 'New Assignment' : 'New Material'
  const today  = new Date().toLocaleDateString('en-CA')
  const nowTime = new Date().toTimeString().slice(0,5)

  return (
    <div className="tcd-overlay" onClick={onClose}>
      <div className="tcd-modal" onClick={e => e.stopPropagation()}>
        <div className="tcd-modal-header">
          <h2 className="tcd-modal-title">{title}</h2>
          <button className="tcd-icon-btn" onClick={onClose}>{Icons.close}</button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="tcd-modal-body">
            {isAnn && (
              <>
                <div className="tcd-field"><label>Title *</label><input value={formData.title} onChange={e => setFormData(f => ({ ...f, title: e.target.value }))} placeholder="Announcement title" required /></div>
                <div className="tcd-field"><label>Content *</label><textarea value={formData.content} onChange={e => setFormData(f => ({ ...f, content: e.target.value }))} rows={4} placeholder="Write your announcement…" required /></div>
              </>
            )}
            {isAsgn && (
              <>
                <div className="tcd-field"><label>Title *</label><input value={formData.title} onChange={e => setFormData(f => ({ ...f, title: e.target.value }))} placeholder="Assignment title" required /></div>
                <div className="tcd-field"><label>Description *</label><textarea value={formData.description} onChange={e => setFormData(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="Instructions…" required /></div>
                <div className="tcd-field"><label>Type *</label>
                  <select value={formData.type || 'Written Works'} onChange={e => setFormData(f => ({ ...f, type: e.target.value }))} required>
                    <option>Written Works</option><option>Performance Task</option><option>Quarterly Assessment</option>
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="tcd-field"><label>Quarter *</label>
                    <select value={formData.quarter || 'Q1'} onChange={e => setFormData(f => ({ ...f, quarter: e.target.value }))} required>
                      <option value="Q1">Q1</option><option value="Q2">Q2</option><option value="Q3">Q3</option><option value="Q4">Q4</option>
                    </select>
                  </div>
                  <div className="tcd-field"><label>Possible Score *</label><input type="number" min="1" value={formData.possibleScore || 100} onChange={e => setFormData(f => ({ ...f, possibleScore: e.target.value }))} required /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="tcd-field"><label>Deadline Date *</label><input type="date" defaultValue={today} onChange={e => setFormData(f => ({ ...f, deadlineDate: e.target.value }))} required /></div>
                  <div className="tcd-field"><label>Deadline Time *</label><input type="time" defaultValue={nowTime} onChange={e => setFormData(f => ({ ...f, deadlineTime: e.target.value }))} required /></div>
                </div>
              </>
            )}
            {!isAnn && !isAsgn && (
              <>
                <div className="tcd-field"><label>Description *</label><textarea value={formData.description} onChange={e => setFormData(f => ({ ...f, description: e.target.value }))} rows={5} placeholder="Describe this material or paste a link…" required /></div>
                <div className="tcd-field"><label>Files *</label><input type="file" multiple accept=".pdf,.docx,.pptx,.xlsx,.txt,.jpg,.png" onChange={e => setFormData(f => ({ ...f, files: e.target.files }))} required /></div>
              </>
            )}
          </div>
          <div className="tcd-modal-footer">
            <button type="button" className="tcd-btn tcd-btn--ghost" onClick={onClose} disabled={posting}>Cancel</button>
            <button type="submit" className="tcd-btn tcd-btn--primary" disabled={posting}>{posting ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ── Assignment Detail Modal (Teacher — read-only + submissions) ── */
function AssignmentDetailModal({ assignment, onClose }) {
  const typeColor = TYPE_COLORS[assignment.type] || '#6b7280'
  const submissions = assignment.submissions || []
  const stats = {
    done: submissions.filter(s => s.status === 'done').length,
    late: submissions.filter(s => s.status === 'late').length,
    notSubmitted: submissions.filter(s => s.status === 'not_submitted').length,
  }
  const [filter, setFilter] = useState('all')

  const getStatusBadge = (status) => {
    const b = { done: { text: 'Done', color: '#10b981' }, late: { text: 'Late', color: '#ef4444' }, not_submitted: { text: 'Pending', color: '#6b7280' } }
    const badge = b[status] || b.not_submitted
    return <span style={{ padding: '3px 10px', borderRadius: 10, fontSize: '0.8rem', fontWeight: 600, backgroundColor: `${badge.color}20`, color: badge.color }}>{badge.text}</span>
  }

  const filtered = filter === 'all' ? submissions : submissions.filter(s => s.status === filter)

  return (
    <div className="tcd-overlay" onClick={onClose} style={{ zIndex: 2000 }}>
      <div className="tcd-modal" style={{ maxWidth: 700 }} onClick={e => e.stopPropagation()}>
        <div className="tcd-modal-header">
          <div style={{ flex: 1 }}>
            <h2 className="tcd-modal-title">{assignment.title}</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>
              <span style={{ color: typeColor, fontWeight: 600 }}>{assignment.type}</span>
              {assignment.quarter && <> · {assignment.quarter}</>}
            </p>
          </div>
          <button className="tcd-icon-btn" onClick={onClose}>{Icons.close}</button>
        </div>

        <div className="tcd-modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {/* Info grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
            {[
              { label: 'Deadline', value: `${fmtDate(assignment.deadline)} ${fmtTime(assignment.deadline)}` },
              { label: 'Possible Score', value: `${assignment.possibleScore} pts` },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: '#f8fafc', borderRadius: 9, padding: '11px 14px', border: '1px solid #e2e8f0' }}>
                <p style={{ margin: '0 0 3px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#94a3b8' }}>{label}</p>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Description */}
          {assignment.description && (
            <div style={{ marginBottom: 18 }}>
              <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#94a3b8' }}>Description</p>
              <p style={{ margin: 0, background: '#f9fafb', borderRadius: 9, padding: '13px 15px', fontSize: 14, color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {assignment.description}
              </p>
            </div>
          )}

          {/* Submission stats */}
          <div style={{ marginBottom: 14 }}>
            <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#94a3b8' }}>Submissions</p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
              {[
                { key: 'all',           label: 'All',     count: submissions.length, color: '#475569' },
                { key: 'done',          label: 'Done',    count: stats.done,          color: '#10b981' },
                { key: 'late',          label: 'Late',    count: stats.late,          color: '#ef4444' },
                { key: 'not_submitted', label: 'Pending', count: stats.notSubmitted,  color: '#6b7280' },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  style={{
                    padding: '6px 14px',
                    border: `2px solid ${filter === f.key ? f.color : `${f.color}30`}`,
                    background: filter === f.key ? f.color : '#fff',
                    color: filter === f.key ? '#fff' : f.color,
                    borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: '0.82rem', fontFamily: 'inherit',
                    transition: 'all 0.15s'
                  }}
                >
                  {f.label} ({f.count})
                </button>
              ))}
            </div>

            {filtered.length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: 14, textAlign: 'center', padding: '24px 0' }}>No students in this category.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filtered.map(sub => (
                  <div key={sub.studentId} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px 14px', background: '#f8fafc', borderRadius: 9,
                    border: '1px solid #e2e8f0', gap: 12
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 10, background: '#dbeafe', color: '#1d4ed8',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 800, fontSize: 14, flexShrink: 0
                      }}>
                        {sub.studentName?.[0]?.toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub.studentName}</p>
                        <p style={{ margin: 0, fontSize: 12, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub.studentEmail}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                      {getStatusBadge(sub.status)}
                      {sub.score != null && (
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#059669' }}>
                          {sub.score}/{assignment.possibleScore}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="tcd-modal-footer">
          <button className="tcd-btn tcd-btn--primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

/* ── Announcement Detail Modal (Teacher) ── */
function AnnouncementDetailModal({ announcement, onClose }) {
  return (
    <div className="tcd-overlay" onClick={onClose} style={{ zIndex: 2000 }}>
      <div className="tcd-modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div className="tcd-modal-header">
          <div style={{ flex: 1 }}>
            <h2 className="tcd-modal-title">{announcement.title}</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>{announcement.className}</p>
          </div>
          <button className="tcd-icon-btn" onClick={onClose}>{Icons.close}</button>
        </div>
        <div className="tcd-modal-body">
          <p style={{ margin: '0 0 14px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#94a3b8' }}>
            Posted {fmt(announcement.createdAt)}
          </p>
          <div style={{ background: '#f9fafb', borderRadius: 10, padding: '16px 18px', color: '#374151', lineHeight: 1.75, fontSize: 15, whiteSpace: 'pre-wrap' }}>
            {announcement.content}
          </div>
        </div>
        <div className="tcd-modal-footer">
          <button className="tcd-btn tcd-btn--primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

export default function TeacherClassDetail() {
  const { classId } = useParams()
  const navigate = useNavigate()
  const { currentUser } = useAuth()

  const [classData,           setClassData]           = useState(null)
  const [assignments,         setAssignments]         = useState([])
  const [announcements,       setAnnouncements]       = useState([])
  const [students,            setStudents]            = useState([])
  const [materials,           setMaterials]           = useState([])
  const [studentStatuses,     setStudentStatuses]     = useState({})
  const [loading,             setLoading]             = useState(true)
  const [activeTab,           setActiveTab]           = useState('general')
  const [notification,        setNotification]        = useState(null)
  const [confirmDialog,       setConfirmDialog]       = useState(null)
  const [copied,              setCopied]              = useState(false)
  const [showOverdueOnly,     setShowOverdueOnly]     = useState(false)
  const [showPostModal,       setShowPostModal]       = useState(false)
  const [postType,            setPostType]            = useState('announcements')
  const [posting,             setPosting]             = useState(false)
  const [formData,            setFormData]            = useState({ title: '', content: '', description: '', files: null })
  const [showNewPicker,       setShowNewPicker]       = useState(false)

  // Detail modals
  const [selectedAssignment,   setSelectedAssignment]   = useState(null)
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null)
  const [loadingDetail,        setLoadingDetail]        = useState(false)

  useEffect(() => { loadClassData() }, [classId])

  const loadClassData = async () => {
    try {
      const [info, asgn, ann, studs, mats] = await Promise.all([
        getClassById(classId), getClassAssignments(classId),
        getClassAnnouncements(classId), getClassStudents(classId), getClassMaterials(classId),
      ])
      setClassData(info); setAssignments(asgn); setAnnouncements(ann); setStudents(studs); setMaterials(mats)
      const { getStudentAssignmentStatus } = await import('../../services/studentAssignmentStatus')
      const statuses = {}
      await Promise.all(studs.map(async s => { statuses[s.id] = await getStudentAssignmentStatus(classId, s.id) }))
      setStudentStatuses(statuses)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const handleCopyCode = () => { navigator.clipboard.writeText(classData.classCode); setCopied(true); setTimeout(() => setCopied(false), 2000) }

  const openPostModal = (type) => { setPostType(type); setFormData({ title: '', content: '', description: '', files: null }); setShowPostModal(true) }
  const openPickerOrModal = (tab) => {
    if (tab === 'general') setShowNewPicker(true)
    else if (tab === 'assignments') openPostModal('assignments')
    else if (tab === 'materials') openPostModal('materials')
    else openPostModal('announcements')
  }
  const handlePickerChoice = (type) => { setShowNewPicker(false); if (type === 'assignments') openPostModal('assignments'); else if (type === 'materials') openPostModal('materials'); else openPostModal('announcements') }

  // Open assignment detail with full submission data
  const handleOpenAssignment = async (assignment) => {
    setLoadingDetail(true)
    try {
      const full = await getAssignmentById(assignment.id)
      setSelectedAssignment(full || assignment)
    } catch {
      setSelectedAssignment(assignment)
    }
    setLoadingDetail(false)
  }

  const handlePost = async (e) => {
    e.preventDefault(); setPosting(true)
    try {
      if (postType === 'announcements') {
        if (!formData.title.trim() || !formData.content.trim()) { setNotification({ message: 'Please fill title and content', type: 'error' }); return }
        const r = await createAnnouncement({ title: formData.title.trim(), content: formData.content.trim(), classId, className: classData.name, teacherId: currentUser.uid, teacherName: currentUser.displayName || 'Teacher' })
        if (r.success) setNotification({ message: 'Announcement posted!', type: 'success' })
        else throw new Error(r.error)
      } else if (postType === 'assignments') {
        if (!formData.title.trim() || !formData.description.trim()) { setNotification({ message: 'Please fill title and description', type: 'error' }); return }
        const deadline = `${formData.deadlineDate || new Date().toLocaleDateString('en-CA')}T${formData.deadlineTime || '23:59'}`
        const r = await createAssignmentSingle({
          title: formData.title.trim(), description: formData.description.trim(), classId,
          className: classData.name, teacherId: currentUser.uid, teacherName: currentUser.displayName || 'Teacher',
          type: formData.type || 'Written Works', quarter: formData.quarter || 'Q1',
          possibleScore: parseFloat(formData.possibleScore) || 100, deadline,
        })
        if (r.success) setNotification({ message: 'Assignment created!', type: 'success' })
        else throw new Error(r.error)
      } else {
        if (!formData.description.trim() || !formData.files?.length) { setNotification({ message: 'Please add description and at least one file', type: 'error' }); return }
        const r = await createMaterial(classId, formData.description.trim(), formData.files, currentUser.uid, currentUser.displayName)
        if (r.success) setNotification({ message: 'Material posted!', type: 'success' })
        else throw new Error(r.error)
      }
      setShowPostModal(false); await loadClassData()
    } catch (err) { setNotification({ message: err.message, type: 'error' }) }
    finally { setPosting(false) }
  }

  const confirmDelete = (title, message, onConfirm) => setConfirmDialog({ title, message, onConfirm, onCancel: () => setConfirmDialog(null), confirmText: 'Delete', type: 'danger' })
  const handleDeleteMaterial = (id) => confirmDelete('Delete Material', 'Delete this material?', async () => { setConfirmDialog(null); const r = await deleteMaterial(id); if (r.success) { setNotification({ message: 'Deleted', type: 'success' }); loadClassData() } else setNotification({ message: r.error, type: 'error' }) })
  const handleDeleteAnn = (id, t) => confirmDelete('Delete Announcement', `Delete "${t}"?`, async () => { setConfirmDialog(null); const { deleteAnnouncement } = await import('../../services/announcementService'); const r = await deleteAnnouncement(id); if (r.success) { setNotification({ message: 'Deleted', type: 'success' }); loadClassData() } else setNotification({ message: r.error, type: 'error' }) })
  const handleDeleteClass = () => confirmDelete('Delete Class', `Delete "${classData?.name}"? All data will be permanently removed.`, async () => { setConfirmDialog(null); const r = await deleteClass(classId); if (r.success) navigate('/teacher-dashboard/class'); else setNotification({ message: r.error, type: 'error' }) })

  const feed = [
    ...announcements.map(a => ({ ...a, _type: 'announcement', _date: a.createdAt })),
    ...materials.map(m    => ({ ...m, _type: 'material',      _date: m.createdAt })),
    ...assignments.map(a  => ({ ...a, _type: 'assignment',    _date: a.createdAt || a.deadline })),
  ].filter(i => i._date).sort((a, b) => {
    const ta = a._date.toMillis ? a._date.toMillis() : new Date(a._date).getTime()
    const tb = b._date.toMillis ? b._date.toMillis() : new Date(b._date).getTime()
    return tb - ta
  })

  const upcoming = assignments
    .filter(a => { if (!a.deadline) return false; const d = a.deadline.toDate ? a.deadline.toDate() : new Date(a.deadline); return d > new Date() })
    .sort((a, b) => { const da = a.deadline.toDate ? a.deadline.toDate() : new Date(a.deadline); const db = b.deadline.toDate ? b.deadline.toDate() : new Date(b.deadline); return da - db })

  if (loading) return <div className="tcd-loading"><div className="tcd-spinner" /><p>Loading class…</p></div>
  if (!classData) return <div className="tcd-loading"><p>Class not found.</p></div>

  const newAction = activeTab === 'people' ? null : () => openPickerOrModal(activeTab)

  return (
    <div className="tcd-page">

      {/* ── BLUE HEADER ── */}
      <div className="tcd-header">
        <button className="tcd-back" onClick={() => navigate('/teacher-dashboard/class')}>{Icons.back} Classes</button>
        <div className="tcd-header-inner">
          <div className="tcd-header-info">
            <div className="tcd-header-eyebrow">
              {classData.grade   && <span>Grade {classData.grade}</span>}
              {classData.section && <span>{classData.section}</span>}
            </div>
            <h1 className="tcd-header-name">{classData.name}</h1>
            <p className="tcd-header-sub">{Icons.teacher} {classData.teacherName}</p>
          </div>
          <div className="tcd-header-actions">
            <button className="tcd-code-pill" onClick={handleCopyCode}>
              {copied ? Icons.check : Icons.copy}
              <span className="tcd-code-label">Code</span>
              <code className="tcd-code-val">{classData.classCode}</code>
              <span className="tcd-code-action">{copied ? 'Copied!' : 'Copy'}</span>
            </button>
            <button className="tcd-danger-btn" onClick={handleDeleteClass}>{Icons.trash} <span>Delete Class</span></button>
          </div>
        </div>
      </div>

      {/* ── TAB BAR ── */}
      <div className="tcd-tabbar">
        <div className="tcd-tabs">
          {TABS.map(t => (
            <button key={t} className={`tcd-tab ${activeTab === t ? 'tcd-tab--active' : ''}`} onClick={() => setActiveTab(t)}>
              <span className="tcd-tab-icon">{Icons[t]}</span>
              <span className="tcd-tab-label">{TAB_LABELS[t]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── FAB ── */}
      {newAction && (
        <button className="tcd-fab" onClick={newAction} aria-label="New">{Icons.plus}</button>
      )}

      {/* ── BODY ── */}
      <div className="tcd-body">
        <div className="tcd-main">

          {/* GENERAL */}
          {activeTab === 'general' && (
            <div className="tcd-section">
              <div className="tcd-section-header">
                <h2 className="tcd-section-title">Recent Activity</h2>
                <button className="tcd-btn tcd-btn--primary tcd-btn--sm tcd-desktop-only" onClick={() => setShowNewPicker(true)}>
                  {Icons.plus} New
                </button>
              </div>
              {feed.length === 0
                ? <div className="tcd-empty">Nothing posted yet.</div>
                : feed.map(item => {
                    if (item._type === 'announcement') return (
                      <FeedCard key={item.id} chip="announcement" title={item.title} meta={fmt(item.createdAt)}
                        onDelete={() => handleDeleteAnn(item.id, item.title)}
                        onClick={() => setSelectedAnnouncement(item)}
                      >
                        <p>{item.content?.length > 120 ? item.content.slice(0, 120) + '…' : item.content}</p>
                      </FeedCard>
                    )
                    if (item._type === 'assignment') return (
                      <FeedCard key={item.id} chip="assignment" title={item.title} meta={`Due ${fmtDate(item.deadline)}`}
                        overdue={isOD(item.deadline)}
                        onClick={() => handleOpenAssignment(item)}
                      >
                        {item.description && <p>{item.description?.length > 100 ? item.description.slice(0, 100) + '…' : item.description}</p>}
                      </FeedCard>
                    )
                    if (item._type === 'material') return (
                      <FeedCard key={item.id} chip="material" title={item.description?.slice(0, 80) || 'Material'} meta={fmt(item.createdAt)}
                        onDelete={() => handleDeleteMaterial(item.id)}
                      >
                        {item.files?.length > 0 && (
                          <div className="tcd-files">
                            {item.files.map((f, i) => <a key={i} href={f.url} target="_blank" rel="noopener" className="tcd-file-pill">{Icons.materials} {f.filename}</a>)}
                          </div>
                        )}
                      </FeedCard>
                    )
                    return null
                  })
              }
            </div>
          )}

          {/* ASSIGNMENTS */}
          {activeTab === 'assignments' && (
            <div className="tcd-section">
              <div className="tcd-section-header">
                <h2 className="tcd-section-title">Assignments <span className="tcd-count">{assignments.length}</span></h2>
                <button className="tcd-btn tcd-btn--primary tcd-btn--sm tcd-desktop-only" onClick={() => openPostModal('assignments')}>{Icons.plus} New</button>
              </div>
              {assignments.length === 0
                ? <div className="tcd-empty">No assignments yet.</div>
                : assignments.map(a => (
                    <FeedCard key={a.id} title={a.title} meta={`Due ${fmtDate(a.deadline)}`}
                      overdue={isOD(a.deadline)}
                      onClick={() => handleOpenAssignment(a)}
                    >
                      <div className="tcd-asgn-meta">
                        <span className="tcd-badge">{a.type}</span>
                        <span className="tcd-badge tcd-badge--gray">{a.quarter}</span>
                        {a.possibleScore && <span className="tcd-badge tcd-badge--gray">{a.possibleScore} pts</span>}
                      </div>
                      {a.description && <p className="tcd-asgn-desc">{a.description?.length > 100 ? a.description.slice(0, 100) + '…' : a.description}</p>}
                      <p className="tcd-asgn-time">
                        {fmtDate(a.deadline)} at {fmtTime(a.deadline)}
                        {isOD(a.deadline) && <span className="tcd-overdue-tag">Overdue</span>}
                      </p>
                    </FeedCard>
                  ))
              }
            </div>
          )}

          {/* ANNOUNCEMENTS */}
          {activeTab === 'announcements' && (
            <div className="tcd-section">
              <div className="tcd-section-header">
                <h2 className="tcd-section-title">Announcements <span className="tcd-count">{announcements.length}</span></h2>
                <button className="tcd-btn tcd-btn--primary tcd-btn--sm tcd-desktop-only" onClick={() => openPostModal('announcements')}>{Icons.plus} New</button>
              </div>
              {announcements.length === 0
                ? <div className="tcd-empty">No announcements yet.</div>
                : announcements.map(a => (
                    <FeedCard key={a.id} title={a.title} meta={fmt(a.createdAt)}
                      onDelete={() => handleDeleteAnn(a.id, a.title)}
                      onClick={() => setSelectedAnnouncement(a)}
                    >
                      <p>{a.content?.length > 120 ? a.content.slice(0, 120) + '…' : a.content}</p>
                    </FeedCard>
                  ))
              }
            </div>
          )}

          {/* MATERIALS */}
          {activeTab === 'materials' && (
            <div className="tcd-section">
              <div className="tcd-section-header">
                <h2 className="tcd-section-title">Materials <span className="tcd-count">{materials.length}</span></h2>
                <button className="tcd-btn tcd-btn--primary tcd-btn--sm tcd-desktop-only" onClick={() => openPostModal('materials')}>{Icons.plus} New</button>
              </div>
              {materials.length === 0
                ? <div className="tcd-empty">No materials yet.</div>
                : materials.map(m => (
                    <FeedCard key={m.id} title="Material" meta={fmt(m.createdAt)} onDelete={() => handleDeleteMaterial(m.id)}>
                      {m.description && <p dangerouslySetInnerHTML={{ __html: linkify(m.description) }} />}
                      {m.files?.length > 0 && (
                        <div className="tcd-files">
                          {m.files.map((f, i) => <a key={i} href={f.url} target="_blank" rel="noopener" className="tcd-file-pill">{Icons.materials} {f.filename}</a>)}
                        </div>
                      )}
                      <p className="tcd-by">By {m.teacherName}</p>
                    </FeedCard>
                  ))
              }
            </div>
          )}

          {/* PEOPLE */}
          {activeTab === 'people' && (
            <div className="tcd-section">
              <div className="tcd-section-header">
                <h2 className="tcd-section-title">Members <span className="tcd-count">{students.length + 1}</span></h2>
                <button className={`tcd-overdue-toggle ${showOverdueOnly ? 'tcd-overdue-toggle--active' : ''}`} onClick={() => setShowOverdueOnly(v => !v)}>
                  {Icons.alert} Overdue only
                </button>
              </div>
              <div className="tcd-people-group">
                <p className="tcd-people-label">Teacher</p>
                <div className="tcd-person tcd-person--teacher">
                  <div className="tcd-avatar">{classData.teacherName?.[0]?.toUpperCase()}</div>
                  <div><p className="tcd-person-name">{classData.teacherName}</p><p className="tcd-person-role">Teacher</p></div>
                </div>
              </div>
              <div className="tcd-people-group">
                <p className="tcd-people-label">Students — {students.length}</p>
                {students.length === 0
                  ? <div className="tcd-empty" style={{ borderRadius: 0, border: 'none', borderTop: '1px dashed #e2e8f0' }}>No students yet.</div>
                  : [...students]
                      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                      .filter(s => !showOverdueOnly || (studentStatuses[s.id]?.overdue ?? 0) > 0)
                      .map(s => {
                        const st = studentStatuses[s.id]
                        return (
                          <div key={s.id} className="tcd-person">
                            <div className="tcd-avatar tcd-avatar--blue">{s.name?.[0]?.toUpperCase()}</div>
                            <p className="tcd-person-name">{s.name}</p>
                            <div className="tcd-student-stats">
                              <span className="tcd-stat-pill tcd-stat-pill--green">{Icons.check} {st?.completed ?? 0} done</span>
                              {(st?.overdue ?? 0) > 0 && <span className="tcd-stat-pill tcd-stat-pill--red">{Icons.alert} {st.overdue} overdue</span>}
                            </div>
                          </div>
                        )
                      })
                }
              </div>
            </div>
          )}
        </div>

        {/* SIDEBAR */}
        <aside className="tcd-sidebar">
          <div className="tcd-upcoming">
            <h3 className="tcd-upcoming-title">{Icons.calendar} Upcoming</h3>
            {upcoming.length === 0
              ? <div className="tcd-upcoming-empty">{Icons.empty}<p>No upcoming work</p></div>
              : (
                <div className="tcd-up-list">
                  {upcoming.map(a => (
                    <div key={a.id} className={`tcd-up-item ${isOD(a.deadline) ? 'tcd-up-item--over' : ''}`}
                      style={{ cursor: 'pointer' }} onClick={() => handleOpenAssignment(a)}>
                      <div className="tcd-up-dot" />
                      <div className="tcd-up-content">
                        <p className="tcd-up-title">{a.title}</p>
                        <p className="tcd-up-date">{fmtDate(a.deadline)} · {fmtTime(a.deadline)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )
            }
          </div>
        </aside>
      </div>

      {/* ── Pickers / Post Modals ── */}
      {showNewPicker && <NewPicker onPick={handlePickerChoice} onClose={() => setShowNewPicker(false)} />}
      {showPostModal && <PostModal postType={postType} formData={formData} setFormData={setFormData} posting={posting} onClose={() => setShowPostModal(false)} onSubmit={handlePost} />}

      {/* ── Assignment Detail Modal ── */}
      {loadingDetail && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div className="tcd-spinner" />
        </div>
      )}
      {selectedAssignment && !loadingDetail && (
        <AssignmentDetailModal assignment={selectedAssignment} onClose={() => setSelectedAssignment(null)} />
      )}

      {/* ── Announcement Detail Modal ── */}
      {selectedAnnouncement && (
        <AnnouncementDetailModal announcement={selectedAnnouncement} onClose={() => setSelectedAnnouncement(null)} />
      )}

      {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      {confirmDialog && <ConfirmDialog title={confirmDialog.title} message={confirmDialog.message} onConfirm={confirmDialog.onConfirm} onCancel={confirmDialog.onCancel} confirmText={confirmDialog.confirmText} type={confirmDialog.type} />}
    </div>
  )
}