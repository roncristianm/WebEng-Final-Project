import { createContext, useContext, useState, useEffect } from 'react'
import Notification from '../components/Notification'

const NotificationContext = createContext()

export function useNotification() {
  return useContext(NotificationContext)
}

export function NotificationProvider({ children }) {
  const [notification, setNotification] = useState(null)

  // Check for pending notification on mount
  useEffect(() => {
    const pendingNotification = sessionStorage.getItem('pendingNotification')
    if (pendingNotification) {
      const { message, type } = JSON.parse(pendingNotification)
      sessionStorage.removeItem('pendingNotification')
      // Show notification after a brief delay to ensure page is loaded
      setTimeout(() => {
        setNotification({ message, type })
      }, 100)
    }
  }, [])

  const showNotification = (message, type = 'success', persist = false) => {
    if (persist) {
      // Store in sessionStorage for cross-page notifications
      sessionStorage.setItem('pendingNotification', JSON.stringify({ message, type }))
    } else {
      setNotification({ message, type })
    }
  }

  const closeNotification = () => {
    setNotification(null)
  }

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={closeNotification}
        />
      )}
    </NotificationContext.Provider>
  )
}
