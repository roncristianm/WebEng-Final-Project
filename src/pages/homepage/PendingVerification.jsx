// src/pages/homepage/PendingVerification.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../../config/firebase'
import bhsaLogo from '../../assets/bhsa-logo.png'
import '../../styles/Auth.css'

function PendingVerification() {
  const navigate    = useNavigate()
  const user        = auth.currentUser
  const [resending, setResending]   = useState(false)
  const [resendMsg, setResendMsg]   = useState('')
  const [resendType, setResendType] = useState('') // 'success' | 'error'

  const handleResend = async () => {
    if (!user) return
    setResending(true)
    setResendMsg('')
    try {
      const res  = await fetch('/sheets-api/email/resend-verification', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          uid:   user.uid,
          email: user.email,
          name:  user.displayName || 'User',
        }),
      })
      const data = await res.json()
      if (data.success) {
        setResendMsg('Verification email sent! Check your inbox.')
        setResendType('success')
      } else {
        throw new Error(data.error)
      }
    } catch (err) {
      setResendMsg('Failed to resend. Please try again.')
      setResendType('error')
    } finally {
      setResending(false)
    }
  }

  const handleSignOut = async () => {
    await signOut(auth)
    navigate('/login')
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
          {/* Email icon */}
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>✉️</div>

          <h2 className="form-title" style={{ marginBottom: '12px' }}>Check Your Email</h2>

          <p style={{ color: '#6b7280', fontSize: '15px', lineHeight: 1.7, marginBottom: '8px' }}>
            We sent a verification link to:
          </p>
          <p style={{ fontWeight: 700, fontSize: '16px', color: '#1f2937', marginBottom: '24px' }}>
            {user?.email}
          </p>

          <p style={{ color: '#6b7280', fontSize: '14px', lineHeight: 1.7, marginBottom: '28px' }}>
            Click the link in the email to activate your account.
            The link expires in <strong>24 hours</strong>.
          </p>

          {/* Resend feedback */}
          {resendMsg && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '20px',
              fontSize: '14px',
              fontWeight: 500,
              background: resendType === 'success' ? '#d1fae5' : '#fee2e2',
              color:      resendType === 'success' ? '#065f46' : '#dc2626',
            }}>
              {resendMsg}
            </div>
          )}

          {/* Resend button */}
          <button
            onClick={handleResend}
            disabled={resending}
            className="btn-primary"
            style={{ marginBottom: '12px' }}
          >
            {resending ? 'Sending...' : '🔁 Resend Verification Email'}
          </button>

          {/* Sign out link */}
          <button
            onClick={handleSignOut}
            style={{
              background: 'none',
              border: 'none',
              color: '#9ca3af',
              fontSize: '14px',
              cursor: 'pointer',
              marginTop: '8px',
              textDecoration: 'underline',
            }}
          >
            Sign out and use a different account
          </button>
        </div>
      </div>
    </div>
  )
}

export default PendingVerification