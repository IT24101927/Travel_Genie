import { useState, useEffect, Component, useCallback } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './App.css'

class RootErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, info) {
    console.error('[RootErrorBoundary] caught:', error, info)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif', background: '#fff', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h2 style={{ color: '#dc2626' }}>Something went wrong</h2>
          <pre style={{ background: '#f3f4f6', padding: '1rem', borderRadius: '8px', textAlign: 'left', fontSize: '0.8rem', overflowX: 'auto', maxWidth: '600px', whiteSpace: 'pre-wrap' }}>
            {this.state.error?.message}
          </pre>
          <button onClick={() => { localStorage.clear(); window.location.href = '/' }}
            style={{ marginTop: '1rem', padding: '0.5rem 1.5rem', background: '#0E7C5F', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
            Clear data &amp; restart
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

class AdminErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, info) {
    console.error('[AdminErrorBoundary] CRASH:', error.message)
    console.error('[AdminErrorBoundary] Stack:', error.stack)
    console.error('[AdminErrorBoundary] Component trace:', info.componentStack)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', background: '#dc2626', color: '#fff', minHeight: '100vh', fontFamily: 'sans-serif' }}>
          <h2>Admin Panel Error: {this.state.error?.message}</h2>
          <pre style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', textAlign: 'left', fontSize: '0.8rem', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
            {this.state.error?.stack}
          </pre>
          <button onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('currentUser'); window.location.href = '/login' }}
            style={{ marginTop: '1rem', padding: '0.5rem 1.5rem', background: '#0E7C5F', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
            Return to Login
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

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

  const handleLoadingComplete = useCallback(() => {
    setLoading(false)
  }, [])

  return (
    <RootErrorBoundary>
      {loading && <Loading onLoaded={handleLoadingComplete} />}
      <Router>
        <Routes>
          <Route path="/" element={<Home theme={theme} toggleTheme={toggleTheme} />} />
          <Route path="/login" element={<Login theme={theme} toggleTheme={toggleTheme} />} />
          <Route path="/signup" element={<Signup theme={theme} toggleTheme={toggleTheme} />} />
          <Route path="/dashboard" element={<Dashboard theme={theme} toggleTheme={toggleTheme} />} />
          <Route path="/profile" element={<Profile theme={theme} toggleTheme={toggleTheme} />} />
          <Route path="/admin" element={<AdminErrorBoundary><AdminDashboard theme={theme} toggleTheme={toggleTheme} /></AdminErrorBoundary>} />
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
    </RootErrorBoundary>
  )
}

export default App

