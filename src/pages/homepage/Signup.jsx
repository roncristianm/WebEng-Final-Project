import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore'
import { auth, db } from '../../config/firebase'
import { useAuth } from '../../context/AuthContext'
import { useNotification } from '../../context/NotificationContext'
import Notification from '../../components/Notification'
import bhsaLogo from '../../assets/bhsa-logo.png'
import '../../styles/Auth.css'

function Signup() {
  const [name, setName]                       = useState('')
  const [gender, setGender]                   = useState('')
  const [role, setRole]                       = useState('')
  const [email, setEmail]                     = useState('')
  const [password, setPassword]               = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError]                     = useState('')
  const [loading, setLoading]                 = useState(false)
  const navigate                              = useNavigate()
  const { currentUser }                       = useAuth()
  const { showNotification }                  = useNotification()

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

    if (password !== confirmPassword) {
      setError('Passwords do not match!')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setError('')
    setLoading(true)

    try {
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(userCredential.user, { displayName: name })

      // Store in Firestore — emailVerified starts false
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        name,
        email,
        gender,
        role,
        emailVerified: false,
        createdAt:     serverTimestamp(),
        updatedAt:     serverTimestamp(),
      })

      // Send verification email via sheets-backend
      try {
        const res  = await fetch('/sheets-api/email/send-verification', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            uid:   userCredential.user.uid,
            email: email,
            name:  name,
          }),
        })
        const data = await res.json()
        if (!data.success) {
          console.error('[Signup] Verification email failed:', data.error)
        }
      } catch (emailErr) {
        console.error('[Signup] Could not send verification email:', emailErr.message)
      }

      // Go to pending verification page
      navigate('/pending-verification', { replace: true })
    } catch (error) {
      console.error('Signup error:', error)
      switch (error.code) {
        case 'auth/email-already-in-use':
          setError('This email is already registered')
          break
        case 'auth/invalid-email':
          setError('Invalid email address')
          break
        case 'auth/weak-password':
          setError('Password is too weak')
          break
        default:
          setError('Failed to create account. Please try again.')
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
          <h2 className="form-title">Create Your Account</h2>
          <form onSubmit={handleSubmit} className="auth-form">

            <div className="form-group">
              <label htmlFor="name">Name</label>
              <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your name" required />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" required />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create a password" required />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input type="password" id="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm your password" required />
            </div>

            <div className="form-group">
              <label>Gender</label>
              <div className="radio-group">
                <label className="radio-label">
                  <input type="radio" name="gender" value="male" checked={gender === 'male'} onChange={(e) => setGender(e.target.value)} required />
                  <span>Male</span>
                </label>
                <label className="radio-label">
                  <input type="radio" name="gender" value="female" checked={gender === 'female'} onChange={(e) => setGender(e.target.value)} required />
                  <span>Female</span>
                </label>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="role">Role</label>
              <select id="role" value={role} onChange={(e) => setRole(e.target.value)} required>
                <option value="">Select your role</option>
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
              </select>
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </form>

          <div className="auth-footer">
            <p>Already have an account? <Link to="/login">Log In</Link></p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Signup