import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './App.css'

// Import components
import Loading from './components/Loading'
import Home from './components/User/Home'
import Login from './components/Login'
import Signup from './components/Signup'
import Dashboard from './components/User/Dashboard'
import Profile from './components/User/Profile'
import AdminDashboard from './components/Admin/AdminDashboard'
import ForgotPassword from './components/ForgotPassword'
import ResetPassword from './components/ResetPassword'
import PlanTrip from './components/User/PlanTrip'
import DistrictExplore from './components/User/DistrictExplore'
import TripPreferences from './components/User/TripPreferences'
import HotelPicker from './components/User/HotelPicker'
import TripBudget from './components/User/TripBudget'
import TripDetails from './components/User/TripDetails'
import ExpenseTracker from './components/User/ExpenseTracker'
import Tours from './components/User/Tours'
import Hotels from './components/User/Hotels'
import PlanTripLanding from './components/User/PlanTripLanding'

function App() {
  const [loading, setLoading] = useState(true)
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

  const handleLoadingComplete = () => {
    setLoading(false)
  }

  return (
    <>
      {loading && <Loading onLoaded={handleLoadingComplete} />}
      <Router>
        <Routes>
          <Route path="/" element={<Home theme={theme} toggleTheme={toggleTheme} />} />
          <Route path="/login" element={<Login theme={theme} toggleTheme={toggleTheme} />} />
          <Route path="/signup" element={<Signup theme={theme} toggleTheme={toggleTheme} />} />
          <Route path="/dashboard" element={<Dashboard theme={theme} toggleTheme={toggleTheme} />} />
          <Route path="/profile" element={<Profile theme={theme} toggleTheme={toggleTheme} />} />
          <Route path="/admin" element={<AdminDashboard theme={theme} toggleTheme={toggleTheme} />} />
          <Route path="/forgot-password" element={<ForgotPassword theme={theme} toggleTheme={toggleTheme} />} />
          <Route path="/reset-password" element={<ResetPassword theme={theme} toggleTheme={toggleTheme} />} />
          <Route path="/plan-trip" element={<PlanTrip theme={theme} toggleTheme={toggleTheme} />} />
          <Route path="/district-explore" element={<DistrictExplore theme={theme} toggleTheme={toggleTheme} />} />
          <Route path="/trip-preferences" element={<TripPreferences theme={theme} toggleTheme={toggleTheme} />} />
          <Route path="/hotel-picker" element={<HotelPicker theme={theme} toggleTheme={toggleTheme} />} />
          <Route path="/trip-budget" element={<TripBudget theme={theme} toggleTheme={toggleTheme} />} />
          <Route path="/trip-details" element={<TripDetails theme={theme} toggleTheme={toggleTheme} />} />
          <Route path="/expenses" element={<ExpenseTracker theme={theme} toggleTheme={toggleTheme} />} />
          <Route path="/tours" element={<Tours theme={theme} toggleTheme={toggleTheme} />} />
          <Route path="/hotels" element={<Hotels theme={theme} toggleTheme={toggleTheme} />} />
          <Route path="/plan-trip-landing" element={<PlanTripLanding theme={theme} toggleTheme={toggleTheme} />} />
        </Routes>
      </Router>
    </>
  )
}

export default App

