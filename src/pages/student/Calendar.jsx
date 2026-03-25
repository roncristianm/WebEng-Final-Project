import { useState, useEffect, useRef } from 'react'
import { auth } from '../../config/firebase'
import { useAuth } from '../../context/AuthContext'
import { getStudentEvents } from '../../services/eventService'
import Notification from '../../components/Notification'
import '../../styles/Calendar.css'
import '../../styles/Dashboard.css'

function Calendar() {
  const { currentUser } = useAuth()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState('month')
  const [listMode, setListMode] = useState('schedule')
  const calendarRef = useRef(null)

  // Data states
  const [studentEvents, setStudentEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [notification, setNotification] = useState(null)

  // Day modal
  const [showDayModal, setShowDayModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState(null)
  const [dayModalEvents, setDayModalEvents] = useState([])

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December']

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  useEffect(() => {
    loadData()
  }, [currentUser])

  const loadData = async () => {
    if (currentUser) {
      setLoading(true)
      try {
        const events = await getStudentEvents(currentUser.uid)
        setStudentEvents(events)
      } catch (error) {
        console.error('Error loading student events:', error)
        setNotification({ message: 'Failed to load calendar', type: 'error' })
      } finally {
        setLoading(false)
      }
    }
  }

  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay()

  const previousMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))

  const getEventsForDate = (day) => {
    const dateToCheck = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    return studentEvents.filter(event =>
      event.date.toDateString() === dateToCheck.toDateString()
    )
  }

  const handleDayClick = (day) => {
    const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    const dayEvts = getEventsForDate(day)
    setSelectedDate(clickedDate)
    setDayModalEvents(dayEvts)
    setShowDayModal(true)
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
          role="button"
          tabIndex={0}
          aria-label={`View posts for day ${day}`}
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
    return <div className="loading">Loading your calendar...</div>
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

        {/* Due Dates placeholder */}
        {listMode === 'duedates' && (
          <div className="due-dates-list">
            <p>Upcoming assignments & announcements grouped by date</p>
          </div>
        )}
      </div>

      {/* ── Day Events Modal ── */}
      {showDayModal && selectedDate && (
        <div className="modal-overlay" onClick={() => setShowDayModal(false)}>
          <div className="modal-content" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18 }}>
                  {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>
                  {dayModalEvents.length === 0
                    ? 'No posts on this date'
                    : `${dayModalEvents.length} post${dayModalEvents.length > 1 ? 's' : ''}`}
                </p>
              </div>
              <button className="modal-close" onClick={() => setShowDayModal(false)}>×</button>
            </div>

            <div className="modal-body" style={{ padding: '20px 28px', maxHeight: 360, overflowY: 'auto' }}>
              {dayModalEvents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px 0', color: '#9ca3af' }}>
                  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.35, marginBottom: 12 }}>
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
                        borderRadius: 10,
                        padding: '13px 15px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 5
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{
                            fontSize: 10,
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            color: colors.color,
                            background: 'rgba(255,255,255,0.65)',
                            borderRadius: 4,
                            padding: '2px 8px'
                          }}>
                            {eventTypeLabel(event.type)}
                          </span>
                          {event.className && (
                            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>
                              {event.className}
                            </span>
                          )}
                        </div>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
                          {event.title}
                        </p>
                        {event.type === 'assignment' && event.deadline && (
                          <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
                            Due: {new Date(event.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ justifyContent: 'flex-end' }}>
              <button className="btn-submit" onClick={() => setShowDayModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
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

export default Calendar