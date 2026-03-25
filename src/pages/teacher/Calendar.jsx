import { useState, useEffect, useRef } from 'react'
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

  // Day modal (View Date)
  const [showDayModal, setShowDayModal] = useState(false)
  const [dayModalEvents, setDayModalEvents] = useState([])

  // Create modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState(null)
  const [createType, setCreateType] = useState('assignment')
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    description: '',
    classId: '',
    type: 'Written Works',
    deadlineDate: '',
    deadlineTime: ''
  })

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const [creating, setCreating] = useState(false)
  const [notification, setNotification] = useState(null)
  const calendarRef = useRef(null)

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
    const dayEvts = getEventsForDate(day)
    setDayModalEvents(dayEvts)
    setShowDayModal(true)
  }

  const handleOpenPost = () => {
    setShowDayModal(false)
    const dateStr = selectedDate.toLocaleDateString('en-CA')
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
        createdAt: clickedDateStr
      }

      if (createType === 'assignment') {
        const deadline = `${formData.deadlineDate}T${formData.deadlineTime}`
        result = await createAssignmentMulti([formData.classId], {
          ...commonData,
          createdAt: clickedDateStr,
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
    const maxVisibleEvents = window.innerWidth < 768 ? 2 : 3
    const today = new Date()
    const todayDayNum = today.getDate()

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty" id={`day-empty-${i}`}></div>)
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dayEvents = getEventsForDate(day)
      const isToday = day === todayDayNum &&
        currentDate.getMonth() === today.getMonth() &&
        currentDate.getFullYear() === today.getFullYear()

      days.push(
        <div
          key={day}
          id={`calendar-day-${day}`}
          className={`calendar-day ${isToday ? 'today' : ''} clickable`}
          onClick={() => handleDayClick(day)}
          onTouchStart={() => {}}
          role="button"
          tabIndex={0}
          aria-label={`View day ${day}`}
          data-day={day}
        >
          <div className="day-number">{day}</div>
          <div className="day-events">
            {dayEvents.slice(0, maxVisibleEvents).map(event => (
              <div key={event.id} className={`event-item ${event.type}`}>
                {event.title.length > 25 ? `${event.title.slice(0, 25)}...` : event.title}
              </div>
            ))}
            {dayEvents.length > maxVisibleEvents && <div className="more-events">+{dayEvents.length - maxVisibleEvents}</div>}
          </div>
        </div>
      )
    }

    return days
  }

  // Auto-scroll to today
  useEffect(() => {
    if (calendarRef.current && listMode === 'schedule' && viewMode === 'month') {
      const timer = setTimeout(() => {
        const todayElement = calendarRef.current?.querySelector('.calendar-day.today')
        if (todayElement) {
          todayElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
        }
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [loading, currentDate, listMode, viewMode])

  if (loading) {
    return <div className="loading">Loading calendar...</div>
  }

  const eventTypeLabel = (type) => {
    if (type === 'assignment') return 'Assignment'
    if (type === 'announcement') return 'Announcement'
    return type
  }

  const eventTypeColor = (type) => {
    if (type === 'assignment') return { bg: '#dbeafe', color: '#1e40af', border: '#0038A8' }
    if (type === 'announcement') return { bg: '#d1fae5', color: '#065f46', border: '#10b981' }
    return { bg: '#f3f4f6', color: '#374151', border: '#9ca3af' }
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
          <div className="calendar-grid" ref={calendarRef}>
            {dayNames.map(day => <div key={day} className="calendar-day-header">{day}</div>)}
            {renderCalendarDays()}
          </div>
        )}

        {listMode === 'duedates' && (
          <div className="due-dates-list">
            <p>Due dates view (group by date)</p>
          </div>
        )}
      </div>

      {/* ── Day Modal (View Date) ── */}
      {showDayModal && selectedDate && (
        <div className="modal-overlay" onClick={() => setShowDayModal(false)}>
          <div className="modal-content" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="modal-header" style={{ alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20 }}>
                  {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>
                  {dayModalEvents.length === 0 ? 'No posts on this date' : `${dayModalEvents.length} post${dayModalEvents.length > 1 ? 's' : ''}`}
                </p>
              </div>
              <button className="modal-close" onClick={() => setShowDayModal(false)}>×</button>
            </div>

            {/* Events list */}
            <div className="modal-body" style={{ padding: '20px 28px', maxHeight: 320, overflowY: 'auto' }}>
              {dayModalEvents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af' }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.4, marginBottom: 10 }}>
                    <rect x="3" y="4" width="18" height="18" rx="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  <p style={{ margin: 0, fontSize: 14 }}>Nothing posted on this day</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {dayModalEvents.map(event => {
                    const colors = eventTypeColor(event.type)
                    return (
                      <div key={event.id} style={{
                        background: colors.bg,
                        borderLeft: `4px solid ${colors.border}`,
                        borderRadius: 9,
                        padding: '12px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{
                            fontSize: 10,
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            color: colors.color,
                            background: 'rgba(255,255,255,0.6)',
                            borderRadius: 4,
                            padding: '1px 7px'
                          }}>
                            {eventTypeLabel(event.type)}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{event.title}</p>
                        {event.className && (
                          <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>{event.className}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer with two action buttons */}
            <div className="modal-footer" style={{ justifyContent: 'flex-end', gap: 10 }}>
              <button
                className="btn-cancel"
                onClick={() => setShowDayModal(false)}
              >
                Close
              </button>
              <button
                className="btn-submit"
                onClick={handleOpenPost}
              >
                + Post
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Modal ── */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content create-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ textAlign: 'center', margin: 0, flex: 1 }}>
                Post for {selectedDate?.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
              </h3>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateSubmit}>
              <div className="modal-body">
                {/* Type Tabs */}
                <div className="type-tabs">
                  <button
                    type="button"
                    className={`tab-btn ${createType === 'assignment' ? 'active' : ''}`}
                    onClick={() => setCreateType('assignment')}
                  >
                    Assignment
                  </button>
                  <button
                    type="button"
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
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </label>

                {createType === 'assignment' ? (
                  <>
                    <label>Description *
                      <textarea
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                        rows="3"
                        required
                      />
                    </label>
                    <label>Type
                      <select
                        value={formData.type}
                        onChange={e => setFormData({ ...formData, type: e.target.value })}
                      >
                        <option>Written Works</option>
                        <option>Performance Task</option>
                        <option>Quarterly Assessment</option>
                      </select>
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <label>Deadline Date *
                        <input type="date" value={formData.deadlineDate} onChange={e => setFormData({ ...formData, deadlineDate: e.target.value })} required />
                      </label>
                      <label>Time *
                        <input type="time" value={formData.deadlineTime} onChange={e => setFormData({ ...formData, deadlineTime: e.target.value })} required />
                      </label>
                    </div>
                  </>
                ) : (
                  <label>Content *
                    <textarea
                      value={formData.content}
                      onChange={e => setFormData({ ...formData, content: e.target.value })}
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
                    style={{ cursor: 'pointer' }}
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