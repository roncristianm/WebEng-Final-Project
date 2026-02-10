import { Link, useNavigate, useLocation } from 'react-router-dom'
import '../styles/Dashboard.css'
import bhsaLogo from '../assets/bhsa-logo.png'

function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()

  // Determine if user is on teacher dashboard
  const isTeacher = location.pathname.startsWith('/teacher-dashboard')
  const basePath = isTeacher ? '/teacher-dashboard' : '/dashboard'

  const handleLogout = () => {
    // Add logout logic here
    console.log('Logging out...')
    navigate('/')
  }

  const isActive = (path) => {
    if (path === basePath) {
      return location.pathname === basePath
    }
    return location.pathname.startsWith(path)
  }

  return (
    <nav className="sidebar">
      <div className="sidebar-header">
        <img src={bhsaLogo} alt="BHSA Logo" className="sidebar-logo" />
        <div className="sidebar-text">
          <h2 className="sidebar-title">Bataan High School For The Arts</h2>
        </div>
      </div>

      <ul className="nav-menu">
        <li>
          <Link to={basePath} className={`nav-item ${isActive(basePath) ? 'active' : ''}`}>
            <span className="nav-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </span>
            <span>Dashboard</span>
          </Link>
        </li>
        <li>
          <Link to={`${basePath}/class`} className={`nav-item ${isActive(`${basePath}/class`) ? 'active' : ''}`}>
            <span className="nav-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
            </span>
            <span>Classes</span>
          </Link>
        </li>
        <li>
          <Link to={`${basePath}/assignment`} className={`nav-item ${isActive(`${basePath}/assignment`) ? 'active' : ''}`}>
            <span className="nav-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
            </span>
            <span>Assignments</span>
          </Link>
        </li>
        <li>
          <Link to={`${basePath}/grade`} className={`nav-item ${isActive(`${basePath}/grade`) ? 'active' : ''}`}>
            <span className="nav-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"/>
                <line x1="12" y1="20" x2="12" y2="4"/>
                <line x1="6" y1="20" x2="6" y2="14"/>
              </svg>
            </span>
            <span>Grades</span>
          </Link>
        </li>
        <li>
          <Link to={`${basePath}/calendar`} className={`nav-item ${isActive(`${basePath}/calendar`) ? 'active' : ''}`}>
            <span className="nav-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </span>
            <span>Calendar</span>
          </Link>
        </li>
      </ul>

      <div className="sidebar-footer">
        <button onClick={handleLogout} className="nav-item logout-btn">
          <span className="nav-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </span>
          <span>Log Out</span>
        </button>
      </div>
    </nav>
  )
}

export default Navbar
