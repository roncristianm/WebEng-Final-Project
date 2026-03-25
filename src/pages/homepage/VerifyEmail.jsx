// src/pages/homepage/VerifyEmail.jsx
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { doc, getDocFromServer } from 'firebase/firestore'
import { useAuth } from '../../context/AuthContext'
import { db } from '../../config/firebase'
import bhsaLogo from '../../assets/bhsa-logo.png'
import '../../styles/Auth.css'

function VerifyEmail() {
  const [searchParams]          = useSearchParams()
  const navigate                = useNavigate()
  const { currentUser }         = useAuth()
  const [status, setStatus]     = useState('loading')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const verified = searchParams.get('verified')
    const error    = searchParams.get('error')

    if (verified === 'true') {
      setStatus('success')
      setTimeout(async () => {
        // If user is logged in, check their role and redirect to correct dashboard
        if (currentUser) {
          try {
            const userDoc  = await getDocFromServer(doc(db, 'users', currentUser.uid))
            if (userDoc.exists()) {
              const role = userDoc.data().role
              if (role === 'teacher') {
                navigate('/teacher-dashboard', { replace: true })
              } else {
                navigate('/dashboard', { replace: true })
              }
              return
            }
          } catch (err) {
            console.error('VerifyEmail role check failed:', err)
          }
        }
        // Not logged in — go to login
        navigate('/login', { replace: true })
      }, 3000)
    } else if (error) {
      setStatus('error')
      const messages = {
        expired:       'This verification link has expired. Please request a new one.',
        already_used:  'This verification link has already been used. You can log in now.',
        invalid:       'This verification link is invalid. Please request a new one.',
        missing_token: 'No verification token found. Please use the link from your email.',
      }
      setErrorMsg(messages[error] || 'Something went wrong. Please try again.')
    } else {
      navigate('/login', { replace: true })
    }
  }, [searchParams, navigate, currentUser])

  const handleManualRedirect = async () => {
    if (currentUser) {
      try {
        const userDoc = await getDocFromServer(doc(db, 'users', currentUser.uid))
        if (userDoc.exists()) {
          const role = userDoc.data().role
          navigate(role === 'teacher' ? '/teacher-dashboard' : '/dashboard', { replace: true })
          return
        }
      } catch (err) {
        console.error('Manual redirect failed:', err)
      }
    }
    navigate('/login', { replace: true })
  }

  if (status === 'loading') {
    return (
      <div className="auth-container">
        <div className="auth-wrapper">
          <div className="auth-card" style={{ textAlign: 'center', padding: '48px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
            <p style={{ color: '#6b7280' }}>Verifying your email...</p>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="auth-container">
        <div className="auth-wrapper">
          <div className="auth-header">
            <img src={bhsaLogo} alt="BHSA Logo" className="auth-logo" />
            <div className="auth-text">
              <h1 className="brand-title">Bataan High School For The Arts</h1>
              <p className="brand-description">Bayan Ng Bayani, Bayani Ng Sining</p>
            </div>
          </div>
          <div className="auth-card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>✅</div>
            <h2 className="form-title" style={{ marginBottom: '12px', color: '#059669' }}>
              Email Verified!
            </h2>
            <p style={{ color: '#6b7280', fontSize: '15px', lineHeight: 1.7, marginBottom: '24px' }}>
              Your email has been verified successfully.<br/>
              Redirecting you to your dashboard...
            </p>
            <button className="btn-primary" onClick={handleManualRedirect}>
              Go to Dashboard →
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-container">
      <div className="auth-wrapper">
        <div className="auth-header">
          <img src={bhsaLogo} alt="BHSA Logo" className="auth-logo" />
          <div className="auth-text">
            <h1 className="brand-title">Bataan High School For The Arts</h1>
            <p className="brand-description">Bayan Ng Bayani, Bayani Ng Sining</p>
          </div>
        </div>
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>❌</div>
          <h2 className="form-title" style={{ marginBottom: '12px', color: '#dc2626' }}>
            Verification Failed
          </h2>
          <p style={{ color: '#6b7280', fontSize: '15px', lineHeight: 1.7, marginBottom: '28px' }}>
            {errorMsg}
          </p>
          <button className="btn-primary" onClick={() => navigate('/login', { replace: true })}>
            Back to Login
          </button>
        </div>
      </div>
    </div>
  )
}

export default VerifyEmail