import { Outlet } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import '../../styles/Dashboard.css'

function StudentDashboard() {
  return (
    <div className="dashboard-container">
      <Navbar />
      <main className="dashboard-content">
        <Outlet />
      </main>
    </div>
  )
}

export default StudentDashboard
