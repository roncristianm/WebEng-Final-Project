import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useEffect, useState } from 'react'
import { doc, getDoc, getDocFromServer } from 'firebase/firestore'
import { db } from '../config/firebase'

function ProtectedRoute({ children }) {
  const { currentUser, loading } = useAuth()
  const location                 = useLocation()
  const [checking, setChecking]  = useState(true)
  const [verified, setVerified]  = useState(false)

  useEffect(() => {
    const checkVerification = async () => {
      if (!currentUser) {
        setChecking(false)
        return
      }
      try {
        const userDoc = await getDocFromServer(doc(db, 'users', currentUser.uid))
        if (userDoc.exists()) {
          const data = userDoc.data()
          setVerified(data.emailVerified !== false)
        } else {
          // No Firestore doc yet — let them through (edge case)
          setVerified(true)
        }
      } catch (err) {
        console.error('ProtectedRoute verification check failed:', err)
        setVerified(false)
      } finally {
        setChecking(false)
      }
    }
    checkVerification()
  }, [currentUser])

  // Prevent caching of protected pages
  useEffect(() => {
    window.history.replaceState(null, '', location.pathname)
    const handleBackButton = (e) => {
      if (!currentUser) {
        e.preventDefault()
        window.history.pushState(null, '', location.pathname)
      }
    }
    window.addEventListener('popstate', handleBackButton)
    return () => window.removeEventListener('popstate', handleBackButton)
  }, [currentUser, location.pathname])

  if (loading || checking) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh'
      }}>
        <div>Loading...</div>
      </div>
    )
  }

  // Not logged in at all
  if (!currentUser) {
    return <Navigate to="/login" replace />
  }

  // Logged in but email not verified
  if (!verified) {
    return <Navigate to="/pending-verification" replace />
  }

  return children
}

export default ProtectedRoute