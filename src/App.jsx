import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuth } from './context/AuthContext'
import LandingPage from './pages/homepage/LandingPage'
import Signup from './pages/homepage/Signup'
import ProtectedRoute from './components/ProtectedRoute'

// Student imports
import StudentDashboard from './pages/student/StudentDashboard'
import StudentDashboardPage from './pages/student/Dashboard'
import StudentClass from './pages/student/Class'
import StudentAssignment from './pages/student/Assignment'
import StudentGrade from './pages/student/Grade'
import StudentCalendar from './pages/student/Calendar'

// Teacher imports
import TeacherDashboard from './pages/teacher/TeacherDashboard'
import TeacherDashboardPage from './pages/teacher/Dashboard'
import TeacherClass from './pages/teacher/Class'
import TeacherAssignment from './pages/teacher/Assignment'
import TeacherGrade from './pages/teacher/Grade'
import TeacherCalendar from './pages/teacher/Calendar'

import './styles/App.css'

function App() {
  const { currentUser, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Monitor navigation and validate authentication state
  useEffect(() => {
    if (loading) return

    const protectedRoutes = ['/dashboard', '/teacher-dashboard']
    const authRoutes = ['/login', '/signup', '/']
    
    const isProtectedRoute = protectedRoutes.some(route => 
      location.pathname.startsWith(route)
    )
    const isAuthRoute = authRoutes.includes(location.pathname)

    // If on protected route without auth, redirect to login
    if (isProtectedRoute && !currentUser) {
      navigate('/login', { replace: true })
    }
    // If on auth route with valid session, redirect to dashboard
    else if (isAuthRoute && currentUser) {
      // Prevent accessing login/signup when already authenticated
      navigate('/dashboard', { replace: true })
    }
  }, [currentUser, loading, location.pathname, navigate])

  // Prevent browser back button from accessing protected pages after logout
  useEffect(() => {
    const handlePopState = () => {
      if (!currentUser && (location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/teacher-dashboard'))) {
        navigate('/login', { replace: true })
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [currentUser, location.pathname, navigate])

  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LandingPage />} />
        <Route path="/signup" element={<Signup />} />
        
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <StudentDashboard />
          </ProtectedRoute>
        }>
          <Route index element={<StudentDashboardPage />} />
          <Route path="class" element={<StudentClass />} />
          <Route path="assignment" element={<StudentAssignment />} />
          <Route path="grade" element={<StudentGrade />} />
          <Route path="calendar" element={<StudentCalendar />} />
        </Route>

        <Route path="/teacher-dashboard" element={
          <ProtectedRoute>
            <TeacherDashboard />
          </ProtectedRoute>
        }>
          <Route index element={<TeacherDashboardPage />} />
          <Route path="class" element={<TeacherClass />} />
          <Route path="assignment" element={<TeacherAssignment />} />
          <Route path="grade" element={<TeacherGrade />} />
          <Route path="calendar" element={<TeacherCalendar />} />
        </Route>
      </Routes>
    </div>
  )
}

export default App
