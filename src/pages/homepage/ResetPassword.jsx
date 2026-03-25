import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth'
import { auth } from '../../config/firebase'
import bhsaLogo from '../../assets/bhsa-logo.png'
import '../../styles/Auth.css'

function ResetPassword() {
  const [searchParams]          = useSearchParams()
  const navigate                = useNavigate()
  const oobCode                 = searchParams.get('oobCode')

  const [status,      setStatus]      = useState('loading') // loading | ready | success | error | invalid
  const [email,       setEmail]       = useState('')
  const [newPw,       setNewPw]       = useState('')
  const [confirmPw,   setConfirmPw]   = useState('')
  const [errorMsg,    setErrorMsg]    = useState('')
  const [submitting,  setSubmitting]  = useState(false)

  // Verify the oobCode is valid on mount
  useEffect(() => {
    if (!oobCode) { setStatus('invalid'); return }
    verifyPasswordResetCode(auth, oobCode)
      .then((email) => { setEmail(email); setStatus('ready') })
      .catch(() => setStatus('invalid'))
  }, [oobCode])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    if (newPw.length < 6)    return setErrorMsg('Password must be at least 6 characters.')
    if (newPw !== confirmPw) return setErrorMsg('Passwords do not match.')
    setSubmitting(true)
    try {
      await confirmPasswordReset(auth, oobCode, newPw)
      setStatus('success')
    } catch (err) {
      setErrorMsg(
        err.code === 'auth/expired-action-code'  ? 'This reset link has expired. Please request a new one.' :
        err.code === 'auth/invalid-action-code'  ? 'This reset link is invalid or already used.' :
        err.code === 'auth/weak-password'        ? 'Password is too weak. Use at least 6 characters.' :
        'Something went wrong. Please try again.'
      )
    }
    setSubmitting(false)
  }

  return (
    <div className="auth-container">
      <div className="auth-wrapper">

        {/* Header */}
        <div className="auth-header">
          <img src={bhsaLogo} alt="BHSA Logo" className="auth-logo" />
          <div className="auth-text">
            <h1 className="brand-title">Bataan High School For The Arts</h1>
            <p className="brand-description">Bayan Ng Bayani, Bayani Ng Sining</p>
          </div>
        </div>

        <div className="auth-card">

          {/* Loading */}
          {status === 'loading' && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#6b7280' }}>
              Verifying your reset link…
            </div>
          )}

          {/* Invalid / expired */}
          {(status === 'invalid' || status === 'error') && (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{
                width: 60, height: 60, borderRadius: 16,
                background: '#fee2e2', color: '#dc2626',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem', color: '#1f2937' }}>
                Link Invalid or Expired
              </h3>
              <p style={{ margin: '0 0 24px', fontSize: '0.88rem', color: '#6b7280', lineHeight: 1.6 }}>
                This password reset link has expired or already been used.<br/>
                Request a new one from the login page.
              </p>
              <button className="btn-primary" onClick={() => navigate('/login')}>
                Back to Log In
              </button>
            </div>
          )}

          {/* Ready — show form */}
          {status === 'ready' && (
            <form onSubmit={handleSubmit} className="auth-form">
              <div style={{ marginBottom: 8 }}>
                <h2 style={{
                  margin: '0 0 6px',
                  fontSize: '1.3rem',
                  fontWeight: 700,
                  color: '#1f2937',
                  fontFamily: "'Montserrat', sans-serif"
                }}>
                  Set New Password
                </h2>
                {email && (
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#6b7280' }}>
                    for <strong style={{ color: '#1f2937' }}>{email}</strong>
                  </p>
                )}
              </div>

              {errorMsg && (
                <div className="error-message">{errorMsg}</div>
              )}

              <div className="form-group">
                <label htmlFor="newPw">New Password</label>
                <input
                  type="password"
                  id="newPw"
                  value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  placeholder="At least 6 characters"
                  autoFocus
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirmPw">Confirm Password</label>
                <input
                  type="password"
                  id="confirmPw"
                  value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)}
                  placeholder="Repeat new password"
                  required
                />
              </div>

              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? 'Saving…' : 'Reset Password'}
              </button>
            </form>
          )}

          {/* Success */}
          {status === 'success' && (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{
                width: 60, height: 60, borderRadius: 16,
                background: '#d1fae5', color: '#059669',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem', color: '#1f2937' }}>
                Password Updated!
              </h3>
              <p style={{ margin: '0 0 24px', fontSize: '0.88rem', color: '#6b7280', lineHeight: 1.6 }}>
                Your password has been changed successfully.<br/>
                You can now log in with your new password.
              </p>
              <button className="btn-primary" onClick={() => navigate('/login')}>
                Go to Log In
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

export default ResetPassword