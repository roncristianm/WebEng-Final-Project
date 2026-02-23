import { useState } from 'react'
import '../../styles/Dashboard.css'
import '../../styles/Calendar.css'

function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState('month') // 'day' or 'month'
  const [listMode, setListMode] = useState('schedule') // 'schedule' or 'duedates'

  // Sample events - replace with real data from backend
  const events = [
    { id: 1, title: 'Math Period', date: new Date(2026, 1, 6), time: '9:00 AM', type: 'class', class: 'MATH 101' },
    { id: 2, title: 'Science Assignment Due', date: new Date(2026, 1, 13), time: '11:59 PM', type: 'assignment', class: 'SCIENCE 201' },
    { id: 3, title: 'Parent Conference', date: new Date(2026, 1, 13), time: '2:00 PM', type: 'meeting', class: 'General' },
    { id: 4, title: 'Grade Submission Deadline', date: new Date(2026, 1, 13), time: '5:00 PM', type: 'deadline', class: 'All Classes' },
    { id: 5, title: 'Department Meeting', date: new Date(2026, 1, 20), time: '3:00 PM', type: 'meeting', class: 'Faculty' }
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
      case 'deadline':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
        )
      case 'meeting':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        )
      case 'class':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
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
