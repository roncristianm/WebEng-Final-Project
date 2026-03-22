import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signInWithEmailAndPassword, setPersistence, browserSessionPersistence, browserLocalPersistence } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../../config/firebase'
import { useAuth } from '../../context/AuthContext'
import { useNotification } from '../../context/NotificationContext'
import Notification from '../../components/Notification'
import bhsaLogo from '../../assets/bhsa-logo.png'
import '../../styles/Auth.css'

function LandingPage() {
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)
  const navigate                  = useNavigate()
  const { currentUser }           = useAuth()
  const { showNotification }      = useNotification()

  // Redirect if already logged in
  useEffect(() => {
    const checkUserRole = async () => {
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            if (!userData.emailVerified) {
              navigate('/pending-verification', { replace: true })
              return
            }
            if (userData.role === 'teacher') {
              navigate('/teacher-dashboard', { replace: true })
            } else {
              navigate('/dashboard', { replace: true })
            }
          } else {
            navigate('/dashboard', { replace: true })
          }
        } catch (error) {
          console.error('Error checking user role:', error)
        }
      }
    }
    checkUserRole()
  }, [currentUser, navigate])

  useEffect(() => {
    const preventBack = () => window.history.pushState(null, '', window.location.href)
    window.addEventListener('popstate', preventBack)
    preventBack()
    return () => window.removeEventListener('popstate', preventBack)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence)
      const userCredential = await signInWithEmailAndPassword(auth, email, password)

      // Check Firestore for role and verification status
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid))

      if (userDoc.exists()) {
        const userData = userDoc.data()

        // Block unverified users — redirect to pending page
        if (!userData.emailVerified) {
          showNotification('Please verify your email before logging in.', 'error')
          setTimeout(() => {
            navigate('/pending-verification', { replace: true })
          }, 1500)
          setLoading(false)
          return
        }

        showNotification('Login successful!', 'success')
        window.history.pushState(null, '', window.location.href)
        setTimeout(() => {
          if (userData.role === 'student') {
            window.location.href = '/dashboard'
          } else if (userData.role === 'teacher') {
            window.location.href = '/teacher-dashboard'
          }
        }, 1500)
      } else {
        // Fallback if no Firestore doc
        showNotification('Login successful!', 'success')
        window.history.pushState(null, '', window.location.href)
        setTimeout(() => {
          window.location.href = '/dashboard'
        }, 1500)
      }
    } catch (error) {
      console.error('Login error:', error)
      switch (error.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          setError('Invalid email or password')
          break
        case 'auth/invalid-email':
          setError('Invalid email address')
          break
        case 'auth/too-many-requests':
          setError('Too many failed attempts. Please try again later')
          break
        default:
          setError('Failed to log in. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      {error && (
        <Notification
          message={error}
          type="error"
          onClose={() => setError('')}
          position="top"
          duration={5000}
        />
      )}
      <div className="auth-wrapper">
        <div className="auth-header">
          <img src={bhsaLogo} alt="BHSA Logo" className="auth-logo" />
          <div className="auth-text">
            <h1 className="brand-title">Bataan High School For The Arts</h1>
            <p className="brand-description">Bayan Ng Bayani, Bayani Ng Sining</p>
          </div>
        </div>

        <div className="auth-card">
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" required />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required />
            </div>

            <div className="form-group checkbox-group">
              <input type="checkbox" id="rememberMe" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
              <label htmlFor="rememberMe" className="checkbox-label">Remember me</label>
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Logging In...' : 'Log In'}
            </button>
          </form>

          <div className="auth-footer">
            <p>Don't have an account? <Link to="/signup">Sign Up</Link></p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LandingPage