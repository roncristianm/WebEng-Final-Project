import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/homepage/LandingPage'
import Signup from './pages/homepage/Signup'
import StudentDashboard from './pages/dashboard/StudentDashboard'
import Dashboard from './pages/dashboard/Dashboard'
import Class from './pages/dashboard/Class'
import Assignment from './pages/dashboard/Assignment'
import Grade from './pages/dashboard/Grade'
import Calendar from './pages/dashboard/Calendar'
import './styles/App.css'

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LandingPage />} />
        <Route path="/signup" element={<Signup />} />
        
        <Route path="/dashboard" element={<StudentDashboard />}>
          <Route index element={<Dashboard />} />
          <Route path="class" element={<Class />} />
          <Route path="assignment" element={<Assignment />} />
          <Route path="grade" element={<Grade />} />
          <Route path="calendar" element={<Calendar />} />
        </Route>
      </Routes>
    </div>
  )
}

export default App
