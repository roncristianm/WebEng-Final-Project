import { useEffect } from 'react'
import '../styles/Notification.css'

function Notification({ message, type = 'success', onClose, duration = 3000 }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✓'
      case 'error':
        return '✕'
      case 'info':
        return 'ℹ'
      case 'warning':
        return '⚠'
      default:
        return '✓'
    }
  }

  return (
    <div className={`notification notification-${type}`}>
      <div className="notification-icon">
        {getIcon()}
      </div>
      <div className="notification-message">
        {message}
      </div>
      <button className="notification-close" onClick={onClose}>
        ×
      </button>
    </div>
  )
}

export default Notification
