import { useState, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { signOut, updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth'
import { auth } from '../config/firebase'
import { useNotification } from '../context/NotificationContext'
import '../styles/Dashboard.css'
import '../styles/Navbar.css'
import bhsaLogo from '../assets/bhsa-logo.png'

function EditProfileModal({ user, onClose }) {
  const [tab,         setTab]         = useState('profile')
  const [displayName, setDisplayName] = useState(user?.displayName || '')
  const [currentPw,   setCurrentPw]   = useState('')
  const [newPw,       setNewPw]       = useState('')
  const [confirmPw,   setConfirmPw]   = useState('')
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState('')
  const [success,     setSuccess]     = useState('')

  const clearFeedback = () => { setError(''); setSuccess('') }

  const handleProfileSave = async (e) => {
    e.preventDefault()
    clearFeedback()
    if (!displayName.trim())                    return setError('Name cannot be empty.')
    if (displayName.trim() === user?.displayName) return setError('No changes to save.')
    setSaving(true)
    try {
      await updateProfile(user, { displayName: displayName.trim() })
      setSuccess('Display name updated successfully.')
    } catch (err) {
      setError(err.message)
    }
    setSaving(false)
  }

  const handlePasswordSave = async (e) => {
    e.preventDefault()
    clearFeedback()
    if (!currentPw)          return setError('Enter your current password.')
    if (newPw.length < 6)    return setError('New password must be at least 6 characters.')
    if (newPw !== confirmPw) return setError('Passwords do not match.')
    setSaving(true)
    try {
      const cred = EmailAuthProvider.credential(user.email, currentPw)
      await reauthenticateWithCredential(user, cred)
      await updatePassword(user, newPw)
      setSuccess('Password changed successfully.')
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
    } catch (err) {
      setError(
        err.code === 'auth/wrong-password'        ? 'Incorrect current password.'
        : err.code === 'auth/too-many-requests'   ? 'Too many attempts. Please wait and try again.'
        : err.code === 'auth/requires-recent-login'? 'Session expired. Please log out and back in.'
        : err.message
      )
    }
    setSaving(false)
  }

  return (
    <div className="ep-overlay" onClick={onClose}>
      <div className="ep-modal" onClick={e => e.stopPropagation()}>

        <div className="ep-header">
          <div className="ep-avatar">{(user?.displayName || 'U')[0].toUpperCase()}</div>
          <div className="ep-header-text">
            <p className="ep-header-name">{user?.displayName || 'User'}</p>
            <p className="ep-header-email">{user?.email}</p>
          </div>
          <button className="ep-close" onClick={onClose} aria-label="Close">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="ep-tabs">
          <button className={`ep-tab ${tab === 'profile' ? 'ep-tab--active' : ''}`}
            onClick={() => { setTab('profile'); clearFeedback() }}>Profile</button>
          <button className={`ep-tab ${tab === 'password' ? 'ep-tab--active' : ''}`}
            onClick={() => { setTab('password'); clearFeedback() }}>Password</button>
        </div>

        {error   && <div className="ep-alert ep-alert--error">{error}</div>}
        {success && <div className="ep-alert ep-alert--success">{success}</div>}

        {tab === 'profile' && (
          <form className="ep-body" onSubmit={handleProfileSave}>
            <div className="ep-field">
              <label className="ep-label">Display Name</label>
              <input className="ep-input" value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Your name" required />
            </div>
            <div className="ep-field">
              <label className="ep-label">Email Address</label>
              <div className="ep-input ep-input--readonly">
                {user?.email}
                <span className="ep-readonly-tag">Read only</span>
              </div>
              <p className="ep-hint">Email cannot be changed here.</p>
            </div>
            <div className="ep-footer">
              <button type="button" className="ep-btn-cancel" onClick={onClose} disabled={saving}>Cancel</button>
              <button type="submit" className="ep-btn-save" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
            </div>
          </form>
        )}

        {tab === 'password' && (
          <form className="ep-body" onSubmit={handlePasswordSave}>
            <div className="ep-field">
              <label className="ep-label">Current Password</label>
              <input className="ep-input" type="password" value={currentPw}
                onChange={e => setCurrentPw(e.target.value)}
                placeholder="Enter current password" required />
            </div>
            <div className="ep-field">
              <label className="ep-label">New Password</label>
              <input className="ep-input" type="password" value={newPw}
                onChange={e => setNewPw(e.target.value)}
                placeholder="At least 6 characters" required />
            </div>
            <div className="ep-field">
              <label className="ep-label">Confirm New Password</label>
              <input className="ep-input" type="password" value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
                placeholder="Repeat new password" required />
            </div>
            <div className="ep-footer">
              <button type="button" className="ep-btn-cancel" onClick={onClose} disabled={saving}>Cancel</button>
              <button type="submit" className="ep-btn-save" disabled={saving}>{saving ? 'Saving…' : 'Change Password'}</button>
            </div>
          </form>
        )}

      </div>
    </div>
  )
}

function LogoutModal({ onConfirm, onCancel }) {
  return (
    <div className="nb-modal-overlay" onClick={onCancel}>
      <div className="nb-modal" onClick={e => e.stopPropagation()}>
        <h3 className="nb-modal-title">Log Out</h3>
        <p className="nb-modal-msg">Are you sure you want to log out?</p>
        <div className="nb-modal-actions">
          <button className="nb-modal-cancel" onClick={onCancel}>Cancel</button>
          <button className="nb-modal-confirm" onClick={onConfirm}>Log Out</button>
        </div>
      </div>
    </div>
  )
}

function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { showNotification } = useNotification()
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [showEditModal,   setShowEditModal]   = useState(false)

  const isTeacher = location.pathname.startsWith('/teacher-dashboard')
  const basePath = isTeacher ? '/teacher-dashboard' : '/dashboard'

  const confirmLogout = async () => {
    setShowLogoutModal(false)
    try {
      await signOut(auth)
      showNotification('Logout successful!', 'success')
      window.history.pushState(null, '', '/login')
      sessionStorage.clear()
      localStorage.removeItem('lastVisitedPage')
      setTimeout(() => { window.location.href = '/login' }, 1500)
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const handleLogout = () => setShowLogoutModal(true)

  const isActive = (path) => {
    if (path === basePath) {
      return location.pathname === basePath
    }
    return location.pathname.startsWith(path)
  }

  return (
    <>
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
          <Link to={`${basePath}/announcements`} className={`nav-item ${isActive(`${basePath}/announcements`) ? 'active' : ''}`}>
            <span className="nav-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </span>
            <span>Announcements</span>
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
        <button className="nav-item nb-profile-btn" onClick={() => setShowEditModal(true)}>
          <span className="nav-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </span>
          <span>Edit Profile</span>
        </button>
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
    {showLogoutModal && <LogoutModal onConfirm={confirmLogout} onCancel={() => setShowLogoutModal(false)} />}
    {showEditModal   && <EditProfileModal user={auth.currentUser} onClose={() => setShowEditModal(false)} />}
    </>
  )
}

export default Navbar