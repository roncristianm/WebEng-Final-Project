import { useState, useEffect } from 'react'
import { auth } from '../../config/firebase'
import { getStudentClasses } from '../../services/classService'
import { getStudentAnnouncements } from '../../services/announcementService'
import Notification from '../../components/Notification'
import '../../styles/Assignment.css' // Reuse polished cards

function Announcements() {
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [notification, setNotification] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null)

  useEffect(() => {
    loadAnnouncements()
  }, [])

  const loadAnnouncements = async () => {
    if (auth.currentUser) {
      const studentAnnouncements = await getStudentAnnouncements(auth.currentUser.uid)
      setAnnouncements(studentAnnouncements)
      setLoading(false)
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
        <h2>Announcements</h2>
        <p className="page-subtitle">Stay updated with class announcements</p>
      </div>

      {loading ? (
        <div className="loading-container">
          <p>Loading announcements...</p>
        </div>
      ) : announcements.length > 0 ? (
        <div className="announcements-grid">
          {announcements.map((announcement) => (
            <div
              key={announcement.id}
              className="assignment-card announcement-card"
              onClick={() => handleViewDetails(announcement)}
              style={{ cursor: 'pointer' }}
            >
              <div className="assignment-card-header">
                <div>
                  <h3>{announcement.title}</h3>
                  <span className="assignment-type announcement-type">
                    {announcement.className}
                  </span>
                </div>
              </div>
              <div className="assignment-card-body">
                <p className="announcement-preview">
                  {announcement.content.length > 100 
                    ? announcement.content.slice(0, 100) + '...' 
                    : announcement.content
                  }
                </p>
                <div className="announcement-date">
                  {formatDateTime(announcement.createdAt)}
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
            <p>Check back later for updates from your teachers.</p>
          </div>
        </div>
      )}

      {/* Announcement Detail Modal */}
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

