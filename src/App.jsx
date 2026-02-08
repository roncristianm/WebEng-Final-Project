import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/homepage/LandingPage'
import Signup from './pages/homepage/Signup'
import './styles/App.css'

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LandingPage />} />
        <Route path="/signup" element={<Signup />} />
      </Routes>
    </div>
  )
}

export default App
