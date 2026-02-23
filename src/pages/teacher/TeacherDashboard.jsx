import { Outlet } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import '../../styles/teacher/Dashboard.css'

function TeacherDashboard() {
  return (
    <div className="dashboard-container">
      <Navbar />
      <main className="dashboard-content">
        <Outlet />
      </main>
    </div>
  )
}

export default TeacherDashboard
