import { useState, useEffect } from 'react'
import { auth } from '../../config/firebase'
import { getTeacherAnnouncements, deleteAnnouncement } from '../../services/announcementService'
import { updateAnnouncement } from '../../services/editService'
import EditContentModal from '../../components/EditContentModal'
import Notification from '../../components/Notification'
import ConfirmDialog from '../../components/ConfirmDialog'
import CreateAnnouncement from '../../components/CreateAnnouncement'
import '../../styles/Assignment.css'

/* ── helpers ── */
function formatDateTime(ts) {
  if (!ts) return ''
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

function timeAgo(ts) {
  if (!ts) return ''
  const d   = ts.toDate ? ts.toDate() : new Date(ts)
  const sec = Math.floor((Date.now() - d.getTime()) / 1000)
  if (sec < 60)    return 'Just now'
  if (sec < 3600)  return `${Math.floor(sec / 60)}m ago`
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`
  if (sec < 604800) return `${Math.floor(sec / 86400)}d ago`
  return formatDateTime(ts)
}

const ACCENTS = [
  '#0038A8', '#0284c7', '#059669', '#7c3aed',
  '#be123c', '#0e7490', '#374151',
]
function classAccent(name = '') {
  const idx = [...name].reduce((s, c) => s + c.charCodeAt(0), 0) % ACCENTS.length
  return ACCENTS[idx]
}

/* ── Icons ── */
const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
    strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
)
const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
    strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>
)

/* ── Detail Modal ── */
function AnnouncementModal({ ann, onClose, onEdit, onDelete }) {
  const accent = classAccent(ann.className)
  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{ zIndex: 2000, alignItems: 'center' }}
    >
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: 580,
          width: '92%',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 20,
          overflow: 'hidden',
        }}
      >
        {/* accent bar */}
        <div style={{ height: 5, background: accent, flexShrink: 0 }} />

        {/* header */}
        <div style={{ padding: '22px 28px 16px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <h2 style={{ margin: '0 0 6px', fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                {ann.title}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: 12, fontWeight: 700,
                  background: `${accent}15`, color: accent,
                  borderRadius: 6, padding: '3px 10px',
                }}>
                  {ann.className}
                </span>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>{formatDateTime(ann.createdAt)}</span>
              </div>
            </div>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
        </div>

        {/* body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '22px 28px' }}>
          {/* action row */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, justifyContent: 'flex-end' }}>
            <button
              onClick={() => { onClose(); onEdit(ann) }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: '#eff6ff', color: '#0038A8',
                border: '1.5px solid #bfdbfe', borderRadius: 8,
                padding: '7px 14px', fontSize: 13, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <EditIcon /> Edit
            </button>
            <button
              onClick={() => { onClose(); onDelete(ann) }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: '#fef2f2', color: '#dc2626',
                border: '1.5px solid #fecaca', borderRadius: 8,
                padding: '7px 14px', fontSize: 13, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <TrashIcon /> Delete
            </button>
          </div>

          {/* content */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderLeft: `3px solid ${accent}`,
            borderRadius: 10,
            padding: '16px 18px',
            fontSize: 14, color: '#374151',
            lineHeight: 1.8, whiteSpace: 'pre-wrap',
          }}>
            {ann.content}
          </div>
        </div>

        {/* footer */}
        <div style={{ padding: '14px 28px 20px', borderTop: '1px solid #f1f5f9', flexShrink: 0, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              background: '#0038A8', color: '#fff', border: 'none',
              padding: '11px 28px', borderRadius: 10, fontSize: 14,
              fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: '0 4px 12px rgba(0,56,168,0.3)',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Announcement Card ── */
function AnnouncementCard({ ann, onClick, onEdit, onDelete }) {
  const accent = classAccent(ann.className)

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 14,
        border: '1px solid #e2e8f0',
        borderLeft: `4px solid ${accent}`,
        padding: '18px 20px',
        display: 'flex',
        gap: 14,
        alignItems: 'flex-start',
        transition: 'box-shadow 0.18s, transform 0.18s',
        cursor: 'pointer',
      }}
      onClick={onClick}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.08)'
        e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = 'none'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      {/* class avatar */}
      <div style={{
        width: 42, height: 42, borderRadius: 11,
        background: `${accent}15`, color: accent,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 800, fontSize: 16, flexShrink: 0,
        border: `1.5px solid ${accent}30`,
      }}>
        {(ann.className || '?')[0].toUpperCase()}
      </div>

      {/* main content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 4 }}>
          <h3 style={{
            margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {ann.title}
          </h3>
          <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500, flexShrink: 0 }}>
            {timeAgo(ann.createdAt)}
          </span>
        </div>

        {/* class tag */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <span style={{
            fontSize: 11, fontWeight: 700,
            background: `${accent}15`, color: accent,
            borderRadius: 5, padding: '2px 8px',
          }}>
            {ann.className}
          </span>
        </div>

        {/* preview */}
        <p style={{
          margin: 0, fontSize: 13, color: '#64748b', lineHeight: 1.55,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}>
          {ann.content}
        </p>
      </div>

      {/* action buttons — stop propagation so card click doesn't also fire */}
      <div
        style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={() => onEdit(ann)}
          title="Edit"
          style={{
            width: 32, height: 32, borderRadius: 8,
            border: '1px solid #e2e8f0', background: '#f8fafc',
            color: '#0038A8', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
          onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}
        >
          <EditIcon />
        </button>
        <button
          onClick={() => onDelete(ann)}
          title="Delete"
          style={{
            width: 32, height: 32, borderRadius: 8,
            border: '1px solid #fecaca', background: '#fff1f2',
            color: '#dc2626', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
          onMouseLeave={e => e.currentTarget.style.background = '#fff1f2'}
        >
          <TrashIcon />
        </button>
      </div>
    </div>
  )
}

/* ── Main Page ── */
export default function Announcements() {
  const [announcements,        setAnnouncements]        = useState([])
  const [loading,              setLoading]              = useState(true)
  const [notification,         setNotification]         = useState(null)
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null)
  const [showCreateModal,      setShowCreateModal]      = useState(false)
  const [confirmDialog,        setConfirmDialog]        = useState(null)
  const [editTarget,           setEditTarget]           = useState(null)
  const [editSaving,           setEditSaving]           = useState(false)
  const [search,               setSearch]               = useState('')

  useEffect(() => { loadAnnouncements() }, [])

  const loadAnnouncements = async () => {
    if (auth.currentUser) {
      setLoading(true)
      const data = await getTeacherAnnouncements(auth.currentUser.uid)
      setAnnouncements(data)
      setLoading(false)
    }
  }

  /* ── Edit ── */
  const handleEdit = (ann) => {
    setSelectedAnnouncement(null)
    setEditTarget(ann)
  }

  const handleSaveEdit = async (fields) => {
    if (!editTarget) return
    setEditSaving(true)
    const result = await updateAnnouncement(editTarget.id, fields)
    setEditSaving(false)
    if (result.success) {
      setNotification({ message: 'Announcement updated!', type: 'success' })
      setEditTarget(null)
      loadAnnouncements()
    } else {
      setNotification({ message: `Error: ${result.error}`, type: 'error' })
    }
  }

  /* ── Delete ── */
  const handleDelete = (ann) => {
    setSelectedAnnouncement(null)
    setConfirmDialog({
      title:   'Delete Announcement',
      message: `Delete "${ann.title}"? This cannot be undone.`,
      onConfirm: async () => {
        setConfirmDialog(null)
        const result = await deleteAnnouncement(ann.id)
        if (result.success) {
          setNotification({ message: 'Announcement deleted', type: 'success' })
          loadAnnouncements()
        } else {
          setNotification({ message: 'Failed to delete', type: 'error' })
        }
      },
      onCancel: () => setConfirmDialog(null),
      confirmText: 'Delete',
      type: 'danger',
    })
  }

  const filtered = announcements.filter(a =>
    !search ||
    a.title?.toLowerCase().includes(search.toLowerCase()) ||
    a.className?.toLowerCase().includes(search.toLowerCase()) ||
    a.content?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="page-container">

      {/* ── Header ── */}
      <div className="section-header">
        <div>
          <h2>Announcements</h2>
          <p className="page-subtitle">Manage announcements across your classes</p>
        </div>
        <button
          className="btn-create-assignment"
          onClick={() => setShowCreateModal(true)}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Announcement
        </button>
      </div>

      {/* ── Search ── */}
      {!loading && announcements.length > 0 && (
        <div style={{ marginBottom: 24, position: 'relative' }}>
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
          >
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search announcements…"
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '12px 16px 12px 40px',
              border: '1.5px solid #e2e8f0', borderRadius: 10,
              fontSize: 14, fontFamily: 'inherit', color: '#0f172a',
              outline: 'none', background: '#fff',
              transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
            onFocus={e => { e.target.style.borderColor = '#0038A8'; e.target.style.boxShadow = '0 0 0 3px rgba(0,56,168,0.1)' }}
            onBlur={e  => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none' }}
          />
        </div>
      )}

      {/* ── Content ── */}
      {loading ? (
        <div className="loading-container"><p>Loading announcements…</p></div>
      ) : filtered.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(ann => (
            <AnnouncementCard
              key={ann.id}
              ann={ann}
              onClick={() => setSelectedAnnouncement(ann)}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state-container">
          <div className="empty-state-card">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
              style={{ marginBottom: 12, color: '#94a3b8' }}>
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            <h3>{search ? 'No results found' : 'No Announcements Yet'}</h3>
            <p>
              {search
                ? 'Try a different search term.'
                : "Create your first announcement to keep your students informed."}
            </p>
            {!search && (
              <button className="btn-create-first" onClick={() => setShowCreateModal(true)}>
                Create Announcement
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Create Modal ── */}
      {showCreateModal && (
        <CreateAnnouncement
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={loadAnnouncements}
        />
      )}

      {/* ── Detail Modal ── */}
      {selectedAnnouncement && (
        <AnnouncementModal
          ann={selectedAnnouncement}
          onClose={() => setSelectedAnnouncement(null)}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {/* ── Edit Modal ── */}
      {editTarget && (
        <EditContentModal
          type="announcement"
          data={editTarget}
          onSave={handleSaveEdit}
          onClose={() => setEditTarget(null)}
          saving={editSaving}
        />
      )}

      {/* ── Confirm Delete ── */}
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