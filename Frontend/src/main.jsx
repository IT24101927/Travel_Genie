import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Clear expired or malformed JWT tokens before any component renders
;(() => {
  const token = localStorage.getItem('token')
  if (token) {
    try {
      // JWTs use base64url encoding — convert to standard base64 before atob()
      const base64Url = token.split('.')[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=')
      const payload = JSON.parse(atob(padded))
      if (!payload.exp || Date.now() / 1000 > payload.exp) {
        localStorage.removeItem('token')
        localStorage.removeItem('currentUser')
      }
    } catch {
      localStorage.removeItem('token')
      localStorage.removeItem('currentUser')
    }
  }
})()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Catch errors that escape React boundaries (e.g. browser extension conflicts)
window.addEventListener('unhandledrejection', (e) => {
  console.error('[TravelGenie] Unhandled promise rejection:', e.reason)
})
window.addEventListener('error', (e) => {
  console.error('[TravelGenie] Uncaught error:', e.message, e.filename, e.lineno)
})
