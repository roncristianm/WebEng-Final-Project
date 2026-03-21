import { useState, useEffect } from 'react'
import { auth } from '../config/firebase'
import { getTeacherClasses } from '../services/classService'
import { createAnnouncementMulti } from '../services/announcementService'
import Notification from './Notification'

const CreateAnnouncement = ({ isOpen, onClose, onSuccess }) => {
  const currentUser = auth.currentUser
  const [teacherClasses, setTeacherClasses] = useState([])
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    classId: ''
  })
  const [creating, setCreating] = useState(false)
  const [notification, setNotification] = useState(null)
  const [loadingClasses, setLoadingClasses] = useState(true)

  useEffect(() => {
    if (currentUser && isOpen) {
      loadClasses()
    }
  }, [currentUser, isOpen])

  const loadClasses = async () => {
    try {
      setLoadingClasses(true)
      const classes = await getTeacherClasses(currentUser.uid)
      setTeacherClasses(classes)
    } catch (error) {
      setNotification({ message: 'Failed to load classes', type: 'error' })
    } finally {
      setLoadingClasses(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.classId || !formData.title || !formData.content.trim()) {
      setNotification({ message: 'Please fill all fields', type: 'error' })
      return
    }
    setCreating(true)
    try {
      const selectedClass = teacherClasses.find(c => c.id === formData.classId)
      const commonData = {
        title: formData.title,
        classId: formData.classId,
        className: selectedClass?.name || 'Unknown Class',
        teacherId: currentUser.uid,
        teacherName: currentUser.displayName || 'Teacher',
        createdAt: new Date().toISOString()
      }
      const result = await createAnnouncementMulti([formData.classId], {
        ...commonData,
        content: formData.content
      })
      if (result.success) {
        setNotification({ message: 'Announcement created successfully!', type: 'success' })
        resetForm()
        onSuccess?.()
        setTimeout(onClose, 1500)
      } else {
        setNotification({ message: `Error: ${result.error}`, type: 'error' })
      }
    } catch (error) {
      setNotification({ message: 'Failed to create announcement', type: 'error' })
    } finally {
      setCreating(false)
    }
  }

  const resetForm = () => {
    setFormData({ title: '', content: '', classId: '' })
    setNotification(null)
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content create-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ textAlign: 'center', margin: 0, flex: 1 }}>Create Announcement</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {loadingClasses ? (
              <p>Loading classes...</p>
            ) : (
              <>
                <label>Title *
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                  />
                </label>
                <label>Content *
                  <textarea
                    name="content"
                    value={formData.content}
                    onChange={handleInputChange}
                    rows="5"
                    required
                  />
                </label>
                <label>Class *
                  <select
                    name="classId"
                    value={formData.classId}
                    onChange={handleInputChange}
                    required
                    style={{cursor: 'pointer'}}>
                    <option value="" disabled>Select a class</option>
                    {teacherClasses.map(cls => (
                      <option key={cls.id} value={cls.id}>{cls.name}</option>
                    ))}
                  </select>
                </label>
              </>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={creating}>
              Cancel
            </button>
            <button type="submit" className="btn-submit" disabled={creating || loadingClasses || !formData.classId || !formData.title}>
              {creating ? 'Creating...' : 'Create Announcement'}
            </button>
          </div>
        </form>
        {notification && (
          <Notification
            message={notification.message}
            type={notification.type}
            onClose={() => setNotification(null)}
          />
        )}
      </div>
    </div>
  )
}

export default CreateAnnouncement
