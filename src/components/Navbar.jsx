import { Link, useNavigate, useLocation } from 'react-router-dom'
import '../styles/Dashboard.css'

function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    // Add logout logic here
    console.log('Logging out...')
    navigate('/')
  }

  const isActive = (path) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard'
    }
    return location.pathname.startsWith(path)
  }

  return (
    <nav className="sidebar">
      <div className="sidebar-header">
        <h2 className="sidebar-title">EduManage</h2>
        <p className="sidebar-subtitle">Student Portal</p>
      </div>

      <ul className="nav-menu">
        <li>
          <Link to="/dashboard" className={`nav-item ${isActive('/dashboard') ? 'active' : ''}`}>
            <span className="nav-icon">🏠</span>
            <span>Dashboard</span>
          </Link>
        </li>
        <li>
          <Link to="/dashboard/class" className={`nav-item ${isActive('/dashboard/class') ? 'active' : ''}`}>
            <span className="nav-icon">📚</span>
            <span>Classes</span>
          </Link>
        </li>
        <li>
          <Link to="/dashboard/assignment" className={`nav-item ${isActive('/dashboard/assignment') ? 'active' : ''}`}>
            <span className="nav-icon">📝</span>
            <span>Assignments</span>
          </Link>
        </li>
        <li>
          <Link to="/dashboard/grade" className={`nav-item ${isActive('/dashboard/grade') ? 'active' : ''}`}>
            <span className="nav-icon">📊</span>
            <span>Grades</span>
          </Link>
        </li>
        <li>
          <Link to="/dashboard/calendar" className={`nav-item ${isActive('/dashboard/calendar') ? 'active' : ''}`}>
            <span className="nav-icon">📅</span>
            <span>Calendar</span>
          </Link>
        </li>
      </ul>

      <div className="sidebar-footer">
        <button onClick={handleLogout} className="nav-item logout-btn">
          <span className="nav-icon">🚪</span>
          <span>Log Out</span>
        </button>
      </div>
    </nav>
  )
}

export default Navbar
