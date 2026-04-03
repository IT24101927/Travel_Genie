import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Clear expired or malformed JWT tokens before any component renders
;(() => {
  const token = localStorage.getItem('token')
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
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
