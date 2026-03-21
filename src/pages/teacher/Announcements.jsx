import { useState, useEffect } from 'react'
import { auth } from '../../config/firebase'
import { getTeacherAnnouncements, deleteAnnouncement } from '../../services/announcementService'
import Notification from '../../components/Notification'
import ConfirmDialog from '../../components/ConfirmDialog'
import CreateAnnouncement from '../../components/CreateAnnouncement'
import '../../styles/Assignment.css'


function Announcements() {
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [notification, setNotification] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null)
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const [announcementToDelete, setAnnouncementToDelete] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    loadAnnouncements()
  }, [])

  const loadAnnouncements = async () => {
    if (auth.currentUser) {
      setLoading(true)
      const teacherAnnouncements = await getTeacherAnnouncements(auth.currentUser.uid)
      setAnnouncements(teacherAnnouncements)
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
        loadAnnouncements() // Refresh list
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

  const formatDateTime = (timestamp) => {
    if (!timestamp) return 'No date'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  return (
    <div className="page-container">
      <div className="section-header">
        <div>
          <h2>My Announcements</h2>
          <p className="page-subtitle">Manage announcements across your classes</p>
        </div>
        {/* Placeholder for Create button */}
        <button className="btn-create-assignment" onClick={() => setShowCreateModal(true)}>
          + New Announcement
        </button>
      </div>

      {loading ? (
        <div className="loading-container">
          <p>Loading announcements...</p>
        </div>
      ) : announcements.length > 0 ? (
        <div className="announcements-grid">
          {announcements.map((announcement) => (
            <div key={announcement.id} className="assignment-card announcement-card">
              <div className="assignment-card-header">
                <div>
                  <h3>{announcement.title}</h3>
                  <span className="assignment-type">{announcement.className}</span>
                </div>
                <button
                  className="btn-delete-assignment"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteClick(announcement)
                  }}
                  title="Delete announcement"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                </button>

              </div>
              <div className="assignment-card-body">
                <p className="announcement-preview">
                  {announcement.content.length > 100 
                    ? announcement.content.slice(0, 100) + '...' 
                    : announcement.content
                  }
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
            <p>You haven't created any announcements yet. Create your first one to keep your students informed!</p>
            <button className="btn-create-first" onClick={() => setShowCreateModal(true)}>Create Announcement</button>
          </div>
        </div>
      )}

      {/* Create Announcement Modal */}
      {showCreateModal && (
        <CreateAnnouncement
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={loadAnnouncements}
        />
      )}

      {/* Detail Modal - Read-only view */}
      {showDetailModal && selectedAnnouncement && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
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
              <div className="announcement-detail">
                <div className="announcement-meta">
                  Posted {formatDateTime(selectedAnnouncement.createdAt)}
                </div>
                <div className="announcement-content">
                  {selectedAnnouncement.content}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showConfirmDelete && announcementToDelete && (
        <ConfirmDialog
          title="Delete Announcement"
          message={`Are you sure you want to delete "${announcementToDelete.title}"? This action cannot be undone.`}
          onConfirm={handleConfirmDelete}
          onCancel={() => {
            setShowConfirmDelete(false)
            setAnnouncementToDelete(null)
          }}
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
        />
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

export default Announcements

