import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useEffect } from 'react'

function ProtectedRoute({ children }) {
  const { currentUser, loading } = useAuth()
  const location = useLocation()

  // Prevent caching of protected pages
  useEffect(() => {
    // Disable browser caching for protected routes
    window.history.replaceState(null, '', location.pathname)
    
    // Prevent back button after logout
    const handleBackButton = (e) => {
      if (!currentUser) {
        e.preventDefault()
        window.history.pushState(null, '', location.pathname)
      }
    }
    
    window.addEventListener('popstate', handleBackButton)
    return () => window.removeEventListener('popstate', handleBackButton)
  }, [currentUser, location.pathname])

  if (loading) {
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

  if (!currentUser) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default ProtectedRoute
