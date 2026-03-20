import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getTeacherClasses } from '../../services/classService'
import { getTeacherEvents } from '../../services/eventService'
import { createAnnouncementMulti } from '../../services/announcementService'
import { createAssignmentMulti } from '../../services/assignmentService'
import Notification from '../../components/Notification'
import '../../styles/Calendar.css'


function Calendar() {
  const { currentUser } = useAuth()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState('month')
  const [listMode, setListMode] = useState('schedule')

  // Data states
  const [teacherClasses, setTeacherClasses] = useState([])
  const [teacherEvents, setTeacherEvents] = useState([])
  const [loading, setLoading] = useState(true)

  // Create modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState(null)
  const [createType, setCreateType] = useState('assignment') // 'assignment' | 'announcement'
  const [formData, setFormData] = useState({
    title: '',
    content: '', // announcement
    description: '', // assignment
    classId: '',
    type: 'Written Works', // assignment
    deadlineDate: '',
    deadlineTime: ''
  })

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const [creating, setCreating] = useState(false)
  const [notification, setNotification] = useState(null)

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  useEffect(() => {
    if (currentUser) {
      loadData()
    }
  }, [currentUser])

  const loadData = async () => {
    setLoading(true)
    try {
      const [classes, events] = await Promise.all([
        getTeacherClasses(currentUser.uid),
        getTeacherEvents(currentUser.uid)
      ])
      setTeacherClasses(classes)
      setTeacherEvents(events)
    } catch (error) {
      console.error('Error loading data:', error)
      setNotification({ message: 'Failed to load data', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay()

  const previousMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))

  const getEventsForDate = (day) => {
    const dateToCheck = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    return teacherEvents.filter(event => 
      event.date.getDate() === dateToCheck.getDate() &&
      event.date.getMonth() === dateToCheck.getMonth() &&
      event.date.getFullYear() === dateToCheck.getFullYear()
    )
  }

  const handleDayClick = (day) => {
    const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    setSelectedDate(clickedDate)
    
    // Prefill deadline with clicked date
    const dateStr = clickedDate.toISOString().split('T')[0]
    const timeStr = new Date().toTimeString().slice(0, 5)
    setFormData(prev => ({
      ...prev,
      deadlineDate: dateStr,
      deadlineTime: timeStr
    }))
    
    setShowCreateModal(true)
  }

  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    if (!formData.classId) {
      setNotification({ message: 'Please select a class', type: 'error' })
      return
    }

    setCreating(true)
    try {
      let result
      const clickedDateStr = selectedDate.toISOString()
      const selectedClass = teacherClasses.find(c => c.id === formData.classId)
      const commonData = {
        title: formData.title,
        classId: formData.classId,
        className: selectedClass?.name || 'Unknown Class',
        teacherId: currentUser.uid,
        teacherName: currentUser.displayName || 'Teacher',
        date: clickedDateStr
      }

      if (createType === 'assignment') {
        const deadline = `${formData.deadlineDate}T${formData.deadlineTime}`
        result = await createAssignmentMulti([formData.classId], {
          ...commonData,
          description: formData.description,
          type: formData.type,
          deadline
        })
      } else {
        result = await createAnnouncementMulti([formData.classId], {
          ...commonData,
          content: formData.content
        })
      }

      if (result.success) {
        setNotification({ message: `${createType} created successfully!`, type: 'success' })
        setShowCreateModal(false)
        resetForm()
        await loadData()
      } else {
        setNotification({ message: `Error: ${result.error}`, type: 'error' })
      }
    } catch (error) {
      setNotification({ message: 'Failed to create', type: 'error' })
    } finally {
      setCreating(false)
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      description: '',
      classId: '',
      type: 'Written Works',
      deadlineDate: '',
      deadlineTime: ''
    })
    setCreateType('assignment')
  }

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate)
    const firstDay = getFirstDayOfMonth(currentDate)
    const days = []

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>)
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dayEvents = getEventsForDate(day)
      const today = new Date()
      const isToday = day === today.getDate() && 
                      currentDate.getMonth() === today.getMonth() && 
                      currentDate.getFullYear() === today.getFullYear()

      days.push(
        <div 
          key={day} 
          className={`calendar-day ${isToday ? 'today' : ''} clickable`}
          onClick={() => handleDayClick(day)}
        >
          <div className="day-number">{day}</div>
          <div className="day-events">
            {dayEvents.slice(0, 3).map(event => (
              <div key={event.id} className={`event-item ${event.type}`}>
                {event.title.length > 20 ? `${event.title.slice(0, 20)}...` : event.title}
              </div>
            ))}
            {dayEvents.length > 3 && <div className="more-events">+{dayEvents.length - 3}</div>}
          </div>
        </div>
      )
    }

    return days
  }

  if (loading) {
    return <div className="loading">Loading calendar...</div>
  }

  return (
    <div className="dashboard-page">
      <div className="calendar-container">
        {/* Header */}
        <div className="calendar-header">
          <div className="list-mode-toggle">
            <button className={`mode-btn ${listMode === 'schedule' ? 'active' : ''}`} onClick={() => setListMode('schedule')}>
              Schedule
            </button>
            <button className={`mode-btn ${listMode === 'duedates' ? 'active' : ''}`} onClick={() => setListMode('duedates')}>
              Due Dates
            </button>
          </div>

          <div className="calendar-nav">
            <button className="nav-btn" onClick={previousMonth}>‹</button>
            <h2>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
            <button className="nav-btn" onClick={nextMonth}>›</button>
          </div>

          <div className="view-toggle">
            <button className={`toggle-btn ${viewMode === 'day' ? 'active' : ''}`} onClick={() => setViewMode('day')}>
              Day
            </button>
            <button className={`toggle-btn ${viewMode === 'month' ? 'active' : ''}`} onClick={() => setViewMode('month')}>
              Month
            </button>
          </div>
        </div>

        {/* Month View */}
        {listMode === 'schedule' && viewMode === 'month' && (
          <div className="calendar-grid">
            {dayNames.map(day => <div key={day} className="calendar-day-header">{day}</div>)}
            {renderCalendarDays()}
          </div>
        )}

        {/* Placeholder other views */}
        {listMode === 'duedates' && (
          <div className="due-dates-list">
            <p>Due dates view (group by date)</p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content create-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create for {selectedDate?.toLocaleDateString()}</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateSubmit}>
              <div className="modal-body">
                {/* Type Tabs */}
                <div className="type-tabs">
                  <button 
                    className={`tab-btn ${createType === 'assignment' ? 'active' : ''}`}
                    onClick={() => setCreateType('assignment')}
                  >
                    Assignment
                  </button>
                  <button 
                    className={`tab-btn ${createType === 'announcement' ? 'active' : ''}`}
                    onClick={() => setCreateType('announcement')}
                  >
                    Announcement
                  </button>
                </div>

                {/* Form Fields */}
                <label>Title *
                  <input
                    type="text"
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    required
                  />
                </label>

                {createType === 'assignment' ? (
                  <>
                    <label>Description *
                      <textarea
                        value={formData.description}
                        onChange={e => setFormData({...formData, description: e.target.value})}
                        rows="3"
                        required
                      />
                    </label>
                    <label>Type
                      <select 
                        value={formData.type}
                        onChange={e => setFormData({...formData, type: e.target.value})}
                      >
                        <option>Written Works</option>
                        <option>Performance Task</option>
                        <option>Quarterly Assessment</option>
                      </select>
                    </label>
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                      <label>Deadline Date *
                        <input type="date" value={formData.deadlineDate} onChange={e => setFormData({...formData, deadlineDate: e.target.value})} required />
                      </label>
                      <label>Time *
                        <input type="time" value={formData.deadlineTime} onChange={e => setFormData({...formData, deadlineTime: e.target.value})} required />
                      </label>
                    </div>
                  </>
                ) : (
                  <label>Content *
                    <textarea
                      value={formData.content}
                      onChange={e => setFormData({...formData, content: e.target.value})}
                      rows="5"
                      required
                    />
                  </label>
                )}

                <label>Class *
                    <select
                    name="classId"
                    value={formData.classId}
                    onChange={handleInputChange}
                    required
                    style={{cursor: 'pointer'}}
                  >
                    <option value="" disabled>Select a class</option>
{teacherClasses.map(cls => (
                      <option key={cls.id} value={cls.id}>{cls.name}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={creating || !formData.classId || !formData.title}>
                  {creating ? 'Creating...' : `Create ${createType}`}
                </button>
              </div>
            </form>
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

export default Calendar

