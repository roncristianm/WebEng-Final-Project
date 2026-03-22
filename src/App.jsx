import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuth } from './context/AuthContext'
import LandingPage from './pages/homepage/LandingPage'
import Signup from './pages/homepage/Signup'
import PendingVerification from './pages/homepage/PendingVerification'
import VerifyEmail from './pages/homepage/VerifyEmail'
import ProtectedRoute from './components/ProtectedRoute'

// Student imports
import StudentDashboard from './pages/student/StudentDashboard'
import StudentDashboardPage from './pages/student/Dashboard'
import StudentClass from './pages/student/Class'
import StudentClassDetail from './pages/student/ClassDetail'
import StudentAssignment from './pages/student/Assignment'
import StudentGrade from './pages/student/Grade'
import StudentCalendar from './pages/student/Calendar'
import StudentAnnouncements from './pages/student/Announcements'

// Teacher imports
import TeacherDashboard from './pages/teacher/TeacherDashboard'
import TeacherDashboardPage from './pages/teacher/Dashboard'
import TeacherClass from './pages/teacher/Class'
import TeacherClassDetail from './pages/teacher/ClassDetail'
import TeacherAssignment from './pages/teacher/Assignment'
import TeacherGrade from './pages/teacher/Grade'
import TeacherCalendar from './pages/teacher/Calendar'
import TeacherAnnouncements from './pages/teacher/Announcements'

import './styles/App.css'

function App() {
  const { currentUser, loading } = useAuth()
  const navigate                 = useNavigate()
  const location                 = useLocation()

  useEffect(() => {
    if (loading) return

    const protectedRoutes  = ['/dashboard', '/teacher-dashboard']
    const isProtectedRoute = protectedRoutes.some(route => location.pathname.startsWith(route))

    // Only kick unauthenticated users off protected routes.
    // Verification checks are handled by ProtectedRoute and the individual auth pages.
    if (isProtectedRoute && !currentUser) {
      navigate('/login', { replace: true })
    }
  }, [currentUser, loading, location.pathname, navigate])

  useEffect(() => {
    const handlePopState = () => {
      if (!currentUser && (
        location.pathname.startsWith('/dashboard') ||
        location.pathname.startsWith('/teacher-dashboard')
      )) {
        navigate('/login', { replace: true })
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [currentUser, location.pathname, navigate])

  return (
    <div className="App">
      <Routes>
        {/* Public routes */}
        <Route path="/"       element={<LandingPage />} />
        <Route path="/login"  element={<LandingPage />} />
        <Route path="/signup" element={<Signup />} />

        {/* Email verification routes — no auth required */}
        <Route path="/pending-verification" element={<PendingVerification />} />
        <Route path="/verify"               element={<VerifyEmail />} />

        {/* Student routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <StudentDashboard />
          </ProtectedRoute>
        }>
          <Route index                 element={<StudentDashboardPage />} />
          <Route path="class"          element={<StudentClass />} />
          <Route path="class/:classId" element={<StudentClassDetail />} />
          <Route path="announcements"  element={<StudentAnnouncements />} />
          <Route path="assignment"     element={<StudentAssignment />} />
          <Route path="grade"          element={<StudentGrade />} />
          <Route path="calendar"       element={<StudentCalendar />} />
        </Route>

        {/* Teacher routes */}
        <Route path="/teacher-dashboard" element={
          <ProtectedRoute>
            <TeacherDashboard />
          </ProtectedRoute>
        }>
          <Route index                 element={<TeacherDashboardPage />} />
          <Route path="class"          element={<TeacherClass />} />
          <Route path="class/:classId" element={<TeacherClassDetail />} />
          <Route path="announcements"  element={<TeacherAnnouncements />} />
          <Route path="assignment"     element={<TeacherAssignment />} />
          <Route path="grade"          element={<TeacherGrade />} />
          <Route path="calendar"       element={<TeacherCalendar />} />
        </Route>
      </Routes>
    </div>
  )
}

export default App