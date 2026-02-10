import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/homepage/LandingPage'
import Signup from './pages/homepage/Signup'

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
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LandingPage />} />
        <Route path="/signup" element={<Signup />} />
        
        <Route path="/dashboard" element={<StudentDashboard />}>
          <Route index element={<StudentDashboardPage />} />
          <Route path="class" element={<StudentClass />} />
          <Route path="assignment" element={<StudentAssignment />} />
          <Route path="grade" element={<StudentGrade />} />
          <Route path="calendar" element={<StudentCalendar />} />
        </Route>

        <Route path="/teacher-dashboard" element={<TeacherDashboard />}>
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
