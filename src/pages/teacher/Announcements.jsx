// src/pages/teacher/Announcements.jsx  (UPDATED — edit support added)
import { useState, useEffect } from 'react'
import { auth } from '../../config/firebase'
import { getTeacherAnnouncements, deleteAnnouncement } from '../../services/announcementService'
import { updateAnnouncement } from '../../services/editService'
import EditContentModal from '../../components/EditContentModal'
import Notification from '../../components/Notification'
import ConfirmDialog from '../../components/ConfirmDialog'
import CreateAnnouncement from '../../components/CreateAnnouncement'
import '../../styles/Assignment.css'

const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
)

function Announcements() {
  const [announcements,       setAnnouncements]       = useState([])
  const [loading,             setLoading]             = useState(true)
  const [notification,        setNotification]        = useState(null)
  const [showDetailModal,     setShowDetailModal]     = useState(false)
  const [selectedAnnouncement,setSelectedAnnouncement]= useState(null)
  const [showConfirmDelete,   setShowConfirmDelete]   = useState(false)
  const [announcementToDelete,setAnnouncementToDelete]= useState(null)
  const [showCreateModal,     setShowCreateModal]     = useState(false)

  // Edit state
  const [editTarget, setEditTarget] = useState(null)
  const [editSaving, setEditSaving] = useState(false)

  useEffect(() => { loadAnnouncements() }, [])

  const loadAnnouncements = async () => {
    if (auth.currentUser) {
      setLoading(true)
      const data = await getTeacherAnnouncements(auth.currentUser.uid)
      setAnnouncements(data)
      setLoading(false)
    }
  }

  const handleDeleteClick = (announcement) => {
    setAnnouncementToDelete(announcement)
    setShowConfirmDelete(true)
  }

  const handleConfirmDelete = async () => {
    if (announcementToDelete) {
      const result = await deleteAnnouncement(announcementToDelete.id)
      if (result.success) {
        setNotification({ message: 'Announcement deleted successfully', type: 'success' })
        loadAnnouncements()
      } else {
        setNotification({ message: 'Failed to delete announcement', type: 'error' })
      }
      setShowConfirmDelete(false)
      setAnnouncementToDelete(null)
    }
  }

  const handleViewDetails = (announcement) => {
    setSelectedAnnouncement(announcement)
    setShowDetailModal(true)
  }

  /* ── Edit handlers ── */
  const handleEditClick = (e, announcement) => {
    e.stopPropagation()
    setShowDetailModal(false)
    setEditTarget(announcement)
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

  const formatDateTime = (timestamp) => {
    if (!timestamp) return 'No date'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
  }

  return (
    <div className="page-container">
      <div className="section-header">
        <div>
          <h2>My Announcements</h2>
          <p className="page-subtitle">Manage announcements across your classes</p>
        </div>
        <button className="btn-create-assignment" onClick={() => setShowCreateModal(true)}>
          + New Announcement
        </button>
      </div>

      {loading ? (
        <div className="loading-container"><p>Loading announcements...</p></div>
      ) : announcements.length > 0 ? (
        <div className="announcements-grid">
          {announcements.map((announcement) => (
            <div key={announcement.id} className="assignment-card announcement-card">
              <div className="assignment-card-header">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {announcement.title}
                  </h3>
                  <span className="assignment-type">{announcement.className}</span>
                </div>
                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button
                    title="Edit announcement"
                    onClick={e => handleEditClick(e, announcement)}
                    style={{
                      background: 'transparent', border: 'none', color: '#0038A8',
                      padding: 6, borderRadius: 6, cursor: 'pointer', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <EditIcon />
                  </button>
                  <button
                    className="btn-delete-assignment"
                    onClick={e => { e.stopPropagation(); handleDeleteClick(announcement) }}
                    title="Delete announcement"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                  </button>
                </div>
              </div>

              <div className="assignment-card-body">
                <p className="announcement-preview">
                  {announcement.content.length > 100
                    ? announcement.content.slice(0, 100) + '...'
                    : announcement.content}
                </p>
                <div className="announcement-date">
                  Posted {formatDateTime(announcement.createdAt)}
                </div>
              </div>

              <div style={{ cursor: 'pointer' }} onClick={() => handleViewDetails(announcement)}>
                <div className="assignment-date" style={{ justifyContent: 'flex-end', marginTop: '12px' }}>
                  View details →
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state-container">
          <div className="empty-state-card">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            <h3>No Announcements</h3>
            <p>You haven't created any announcements yet.</p>
            <button className="btn-create-first" onClick={() => setShowCreateModal(true)}>Create Announcement</button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateAnnouncement
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={loadAnnouncements}
        />
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedAnnouncement && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>{selectedAnnouncement.title}</h2>
                <p style={{ fontSize: '0.9rem', color: '#6b7280', marginTop: '4px' }}>
                  {selectedAnnouncement.className}
                </p>
              </div>
              <button className="modal-close" onClick={() => setShowDetailModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {/* Edit button in detail view */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <button
                  onClick={e => handleEditClick(e, selectedAnnouncement)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: '#eff6ff', color: '#0038A8', border: '1.5px solid #bfdbfe',
                    borderRadius: 8, padding: '7px 14px', fontSize: '0.82rem', fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  <EditIcon /> Edit Announcement
                </button>
              </div>
              <div className="announcement-detail">
                <div className="announcement-meta">
                  Posted {formatDateTime(selectedAnnouncement.createdAt)}
                </div>
                <div className="announcement-content" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.75 }}>
                  {selectedAnnouncement.content}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editTarget && (
        <EditContentModal
          type="announcement"
          data={editTarget}
          onSave={handleSaveEdit}
          onClose={() => setEditTarget(null)}
          saving={editSaving}
        />
      )}

      {/* Delete Confirmation */}
      {showConfirmDelete && announcementToDelete && (
        <ConfirmDialog
          title="Delete Announcement"
          message={`Are you sure you want to delete "${announcementToDelete.title}"? This action cannot be undone.`}
          onConfirm={handleConfirmDelete}
          onCancel={() => { setShowConfirmDelete(false); setAnnouncementToDelete(null) }}
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
        />
      )}

      {notification && (
        <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />
      )}
    </div>
  )
}

export default Announcements