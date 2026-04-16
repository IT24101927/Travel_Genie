const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

// Normalize once so all fetch calls can safely append paths without double slashes.
export const API_BASE_URL = rawBaseUrl.replace(/\/$/, '')
export const API_BASE = `${API_BASE_URL}/api`
