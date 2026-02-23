import { useState } from 'react'
import '../../styles/Dashboard.css'
import '../../styles/Calendar.css'

function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState('month') // 'day' or 'month'
  const [listMode, setListMode] = useState('schedule') // 'schedule' or 'duedates'

  // Sample events - replace with real data from backend
  const events = [
    { id: 1, title: 'Math Assignment', date: new Date(2026, 1, 6), time: '10:00 AM', type: 'assignment', class: 'MATH 101' },
    { id: 2, title: 'Science Quiz', date: new Date(2026, 1, 13), time: '2:00 PM', type: 'quiz', class: 'SCIENCE 201' },
    { id: 3, title: 'English Essay', date: new Date(2026, 1, 13), time: '5:00 PM', type: 'assignment', class: 'ENGLISH 102' },
    { id: 4, title: 'History Project', date: new Date(2026, 1, 13), time: '11:59 PM', type: 'project', class: 'HISTORY 301' },
    { id: 5, title: 'Physics Lab Report', date: new Date(2026, 1, 20), time: '3:00 PM', type: 'assignment', class: 'PHYSICS 202' }
  ]

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December']
  
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const getDaysInMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    return new Date(year, month, 1).getDay()
  }

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const getEventsForDate = (day) => {
    const dateToCheck = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    return events.filter(event => 
      event.date.getDate() === dateToCheck.getDate() &&
      event.date.getMonth() === dateToCheck.getMonth() &&
      event.date.getFullYear() === dateToCheck.getFullYear()
    )
  }

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate)
    const firstDay = getFirstDayOfMonth(currentDate)
    const days = []

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>)
    }

    // Days of the month
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
            {dayEvents.map(event => (
              <div key={event.id} className={`event-item ${event.type}`}>
                {event.title}
              </div>
            ))}
          </div>
        </div>
      )
    }

    return days
  }

  const groupEventsByDate = () => {
    const sortedEvents = [...events].sort((a, b) => a.date - b.date)
    const grouped = {}
    
    sortedEvents.forEach(event => {
      const dateKey = event.date.toDateString()
      if (!grouped[dateKey]) {
        grouped[dateKey] = []
      }
      grouped[dateKey].push(event)
    })
    
    return grouped
  }

  const formatDateHeader = (dateStr) => {
    const date = new Date(dateStr)
    const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()]
    const month = monthNames[date.getMonth()]
    const day = date.getDate()
    const year = date.getFullYear()
    return `${dayOfWeek} - ${month} ${day}, ${year}`
  }

  const getEventIcon = (type) => {
    switch(type) {
      case 'assignment':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
        )
      case 'quiz':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <line x1="9" y1="9" x2="15" y2="9"/>
            <line x1="9" y1="15" x2="15" y2="15"/>
          </svg>
        )
      case 'project':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
        )
      default:
        return null
    }
  }

  return (
    <div className="dashboard-page">
      <div className="calendar-container">
        {/* Calendar Header */}
        <div className="calendar-header">
          <div className="list-mode-toggle">
            <button 
              className={`mode-btn ${listMode === 'schedule' ? 'active' : ''}`}
              onClick={() => setListMode('schedule')}
            >
              Schedule
            </button>
            <button 
              className={`mode-btn ${listMode === 'duedates' ? 'active' : ''}`}
              onClick={() => setListMode('duedates')}
            >
              Due Dates
            </button>
          </div>

          <div className="calendar-nav">
            <button className="nav-btn" onClick={previousMonth}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
            <h2 className="calendar-month">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <button className="nav-btn" onClick={nextMonth}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>
          
          <div className="view-toggle">
            <button 
              className={`toggle-btn ${viewMode === 'day' ? 'active' : ''}`}
              onClick={() => setViewMode('day')}
            >
              Day
            </button>
            <button 
              className={`toggle-btn ${viewMode === 'month' ? 'active' : ''}`}
              onClick={() => setViewMode('month')}
            >
              Month
            </button>
          </div>
        </div>

        {/* Calendar Grid - Schedule View */}
        {listMode === 'schedule' && viewMode === 'month' && (
          <div className="calendar-grid">
            {/* Day headers */}
            {dayNames.map(day => (
              <div key={day} className="calendar-day-header">{day}</div>
            ))}
            
            {/* Calendar days */}
            {renderCalendarDays()}
          </div>
        )}

        {listMode === 'schedule' && viewMode === 'day' && (
          <div className="day-view">
            <p className="empty-state">Day view coming soon</p>
          </div>
        )}

        {/* Due Dates List View */}
        {listMode === 'duedates' && (
          <div className="due-dates-list">
            {Object.entries(groupEventsByDate()).map(([dateStr, dateEvents]) => (
              <div key={dateStr} className="date-group">
                <div className="date-header">{formatDateHeader(dateStr)}</div>
                {dateEvents.map(event => (
                  <div key={event.id} className={`due-date-card ${event.type}`}>
                    <div className="event-icon">
                      {getEventIcon(event.type)}
                    </div>
                    <div className="event-details">
                      <h3 className="event-title">{event.title}</h3>
                      <p className="event-meta">
                        Due date: {event.date.getMonth() + 1}/{event.date.getDate()}/{event.date.getFullYear().toString().slice(-2)}, {event.time}
                      </p>
                      <p className="event-class">{event.class}</p>
                    </div>
                  </div>
                ))}
              </div>
            ))}
            {events.length === 0 && (
              <div className="empty-state-large">
                <p>No upcoming due dates</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Calendar
