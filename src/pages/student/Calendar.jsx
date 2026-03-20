import { useState, useEffect } from 'react'
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

  // Data states
  const [studentEvents, setStudentEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [notification, setNotification] = useState(null)

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
        <div key={day} className={`calendar-day ${isToday ? 'today' : ''}`}>
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
          <div className="calendar-grid">
            {dayNames.map(day => <div key={day} className="calendar-day-header">{day}</div>)}
            {renderCalendarDays()}
          </div>
        )}

        {/* Due Dates placeholder */}
        {listMode === 'duedates' && (
          <div className="due-dates-list">
            <p>Upcoming assignments & announcements grouped by date</p>
            {/* Add later if needed */}
          </div>
        )}
      </div>

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

