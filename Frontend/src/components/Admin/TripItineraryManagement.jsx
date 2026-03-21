import { useState, useEffect, useCallback } from 'react'
import './TripItineraryManagement.css'
import { API_BASE } from '../../config/api'

const API = API_BASE
const authH = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
})

const mapTrip = (t) => ({
  id: t.trip_id || t.id,
  tripName: t.title,
  destination: t.district?.name || `District #${t.district_id}`,
  district_id: t.district_id,
  duration: t.num_days || 0,
  startDate: t.start_date,
  endDate: t.end_date,
  totalBudget: t.total_budget || 0,
  spentBudget: 0,
  activities: Array.isArray(t.tripDays) ? t.tripDays.reduce((s, d) => s + (d.itineraryItems?.length || 0), 0) : 0,
  status: t.status,
  participants: t.num_people,
  notes: t.notes,
  createdBy: t.user?.name || 'User',
  lastModified: t.updatedAt,
})

function TripItineraryManagement({ theme, toggleTheme }) {
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [toastMsg, setToastMsg] = useState('')
  const [saving, setSaving] = useState(false)

  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState('add') // 'add' or 'edit' or 'schedule'
  const [selectedTrip, setSelectedTrip] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [sortBy, setSortBy] = useState('startDate')

  // System-recommended activities (static curated content)
  const recommendedActivities = [
    { id: 1, name: 'Temple of the Tooth Visit', category: 'Cultural', duration: 2, cost: 30, rating: 4.8, popularity: 95 },
    { id: 2, name: 'Sigiriya Rock Climbing', category: 'Adventure', duration: 3, cost: 45, rating: 4.9, popularity: 92 },
    { id: 3, name: 'Elephant Orphanage Tour', category: 'Wildlife', duration: 2.5, cost: 40, rating: 4.7, popularity: 88 },
    { id: 4, name: 'Tea Plantation Walk', category: 'Nature', duration: 4, cost: 35, rating: 4.6, popularity: 85 },
    { id: 5, name: 'Traditional Dance Show', category: 'Cultural', duration: 1.5, cost: 25, rating: 4.5, popularity: 80 },
    { id: 6, name: 'Whale Watching', category: 'Wildlife', duration: 5, cost: 65, rating: 4.9, popularity: 93 },
    { id: 7, name: 'Surfing Lessons', category: 'Adventure', duration: 3, cost: 50, rating: 4.7, popularity: 87 },
    { id: 8, name: 'Beach Relaxation', category: 'Leisure', duration: 4, cost: 0, rating: 4.8, popularity: 90 },
    { id: 9, name: 'Safari Jeep Tour', category: 'Wildlife', duration: 6, cost: 75, rating: 4.9, popularity: 96 },
    { id: 10, name: 'Bird Watching', category: 'Nature', duration: 3, cost: 30, rating: 4.6, popularity: 78 }
  ]

  const [formData, setFormData] = useState({
    title: '',
    district_id: '',
    start_date: '',
    end_date: '',
    num_people: 1,
    total_budget: 0,
    hotel_budget: 0,
    status: 'draft',
    notes: '',
  })

  const [scheduleData, setScheduleData] = useState({ day: 1, activities: [] })
  const [selectedActivities, setSelectedActivities] = useState([])
  const [dailySchedules, setDailySchedules] = useState({})

  const showToast = (msg) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 3000)
  }

  const loadTrips = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API}/trips/all?limit=200`, { headers: authH() })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to load trips')
      setTrips((data.data || []).map(mapTrip))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadTrips() }, [loadTrips])

  // Open Edit Modal
  const handleEdit = (trip) => {
    setModalMode('edit')
    setSelectedTrip(trip)
    setFormData({
      title: trip.tripName,
      district_id: trip.district_id || '',
      start_date: trip.startDate ? trip.startDate.split('T')[0] : '',
      end_date: trip.endDate ? trip.endDate.split('T')[0] : '',
      num_people: trip.participants,
      total_budget: trip.totalBudget,
      hotel_budget: 0,
      status: trip.status,
      notes: trip.notes || '',
    })
    setShowModal(true)
  }

  // Open Schedule Modal
  const handleSchedule = (trip) => {
    setModalMode('schedule')
    setSelectedTrip(trip)
    setShowModal(true)
  }

  // Handle Form Submit
  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const body = {
        title: formData.title,
        district_id: parseInt(formData.district_id),
        start_date: formData.start_date,
        end_date: formData.end_date,
        num_people: parseInt(formData.num_people),
        total_budget: parseFloat(formData.total_budget),
        hotel_budget: parseFloat(formData.hotel_budget) || 0,
        status: formData.status,
        notes: formData.notes,
      }
      const res = await fetch(`${API}/trips/${selectedTrip.id}`, { method: 'PUT', headers: authH(), body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to save trip')
      showToast('Trip updated!')
      setShowModal(false)
      loadTrips()
    } catch (err) {
      showToast('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  // Handle Delete
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this trip itinerary?')) return
    try {
      const res = await fetch(`${API}/trips/${id}`, { method: 'DELETE', headers: authH() })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to delete trip')
      setTrips(trips.filter(t => t.id !== id))
      showToast('Trip deleted!')
    } catch (err) {
      showToast('Error: ' + err.message)
    }
  }

  // Add Activity to Schedule
  const handleAddActivity = (activity) => {
    if (!selectedActivities.find(a => a.id === activity.id)) {
      setSelectedActivities([...selectedActivities, { ...activity, day: 1, startTime: '09:00', endTime: '11:00' }])
    }
  }

  // Remove Activity from Schedule
  const handleRemoveActivity = (activityId) => {
    setSelectedActivities(selectedActivities.filter(a => a.id !== activityId))
  }

  // Update Activity Schedule
  const updateActivitySchedule = (activityId, field, value) => {
    setSelectedActivities(selectedActivities.map(a =>
      a.id === activityId ? { ...a, [field]: value } : a
    ))
  }

  // Filter and Sort Trips
  const filteredTrips = trips
    .filter(trip => {
      const matchesSearch = (trip.tripName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (trip.destination || '').toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = filterStatus === 'all' || trip.status === filterStatus
      return matchesSearch && matchesStatus
    })
    .sort((a, b) => {
      switch(sortBy) {
        case 'tripName': return (a.tripName || '').localeCompare(b.tripName || '')
        case 'startDate': return new Date(a.startDate) - new Date(b.startDate)
        case 'budget': return b.totalBudget - a.totalBudget
        case 'duration': return b.duration - a.duration
        default: return 0
      }
    })

  return (
    <div className="trip-management">
      {toastMsg && (
        <div className="toast-notification" style={{position:'fixed',top:20,right:20,background:'#4caf50',color:'#fff',padding:'12px 20px',borderRadius:8,zIndex:9999,boxShadow:'0 4px 12px rgba(0,0,0,0.2)'}}>
          {toastMsg}
        </div>
      )}
      {error && (
        <div style={{background:'#f44336',color:'#fff',padding:'10px 16px',borderRadius:6,marginBottom:12}}>
          Error: {error} — <button onClick={loadTrips} style={{background:'none',border:'none',color:'#fff',textDecoration:'underline',cursor:'pointer'}}>Retry</button>
        </div>
      )}

      {/* Header */}
      <div className="tm-header">
        <div>
          <h1 className="tm-title">Trip Itinerary Management</h1>
          <p className="tm-subtitle">Plan and manage trip schedules with smart recommendations</p>
        </div>

      </div>

      {/* Stats Cards */}
      <div className="tm-stats">
        <div className="tm-stat-card">
          <span className="stat-icon">🗺️</span>
          <div>
            <p className="stat-value">{loading ? '…' : trips.length}</p>
            <p className="stat-label">Total Trips</p>
          </div>
        </div>
        <div className="tm-stat-card">
          <span className="stat-icon">🚀</span>
          <div>
            <p className="stat-value">{loading ? '…' : trips.filter(t => t.status === 'ongoing' || t.status === 'planned').length}</p>
            <p className="stat-label">Active Trips</p>
          </div>
        </div>
        <div className="tm-stat-card">
          <span className="stat-icon">💰</span>
          <div>
            <p className="stat-value">{loading ? '…' : `$${trips.reduce((sum, t) => sum + (t.totalBudget || 0), 0).toLocaleString()}`}</p>
            <p className="stat-label">Total Budget</p>
          </div>
        </div>
        <div className="tm-stat-card">
          <span className="stat-icon">👥</span>
          <div>
            <p className="stat-value">{loading ? '…' : trips.reduce((sum, t) => sum + (t.participants || 0), 0)}</p>
            <p className="stat-label">Total Travelers</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="tm-filters">
        <div className="filter-group">
          <label>🔍 Search</label>
          <input
            type="text"
            placeholder="Search trips..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="filter-input"
          />
        </div>

        <div className="filter-group">
          <label>📊 Status</label>
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="planned">Planned</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="filter-group">
          <label>🔢 Sort By</label>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="filter-select"
          >
            <option value="startDate">Start Date</option>
            <option value="tripName">Trip Name</option>
            <option value="budget">Budget</option>
            <option value="duration">Duration</option>
          </select>
        </div>
      </div>

      {/* Trips Table */}
      <div className="trips-table-container">
        {loading ? (
          <div style={{textAlign:'center',padding:'40px',color:'var(--text-secondary)'}}><p>⏳ Loading trips...</p></div>
        ) : filteredTrips.length > 0 ? (
          <table className="trips-table">
            <thead>
              <tr>
                <th>Trip Name</th>
                <th>Destination</th>
                <th>Duration</th>
                <th>Start Date</th>
                <th>Budget</th>
                <th>Spent</th>
                <th>Activities</th>
                <th>Participants</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTrips.map(trip => (
                <tr key={trip.id}>
                  <td className="td-trip-name">
                    <strong>{trip.tripName}</strong>
                    <span className="trip-meta">Updated {trip.lastModified}</span>
                  </td>
                  <td>📍 {trip.destination}</td>
                  <td>
                    <span className="duration-badge">{trip.duration} days</span>
                  </td>
                  <td>{new Date(trip.startDate).toLocaleDateString()}</td>
                  <td>
                    <span className="budget-badge">${trip.totalBudget}</span>
                  </td>
                  <td>
                    <div className="budget-progress">
                      <div 
                        className="budget-bar" 
                        style={{ width: `${(trip.spentBudget / trip.totalBudget) * 100}%` }}
                      />
                      <span className="budget-text">${trip.spentBudget}</span>
                    </div>
                  </td>
                  <td className="td-center">{trip.activities}</td>
                  <td className="td-center">{trip.participants}</td>
                  <td>
                    <span className={`status-badge-trip status-${trip.status}`}>
                      {trip.status}
                    </span>
                  </td>
                  <td className="td-actions">
                    <div className="action-buttons">
                      <button 
                        className="btn-schedule" 
                        onClick={() => handleSchedule(trip)}
                        title="Schedule"
                      >
                        📅
                      </button>
                      <button 
                        className="btn-table-edit" 
                        onClick={() => handleEdit(trip)}
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button 
                        className="btn-table-delete" 
                        onClick={() => handleDelete(trip.id)}
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <span className="empty-icon">🗺️</span>
            <h3>No trips found</h3>
            <p>Try adjusting your filters or create a new trip</p>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showModal && modalMode === 'edit' && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>✏️ Edit Trip</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

              <form onSubmit={handleSubmit} className="trip-form">
              {/* Basic Info */}
              <div className="form-section">
                <h3 className="section-title">📋 Basic Information</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Trip Title *</label>
                    <input type="text" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} required placeholder="e.g., Cultural Heritage Tour" />
                  </div>
                  <div className="form-group">
                    <label>District ID *</label>
                    <input type="number" value={formData.district_id} onChange={(e) => setFormData({...formData, district_id: e.target.value})} required placeholder="e.g., 1" />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Start Date *</label>
                    <input type="date" value={formData.start_date} onChange={(e) => setFormData({...formData, start_date: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label>End Date *</label>
                    <input type="date" value={formData.end_date} onChange={(e) => setFormData({...formData, end_date: e.target.value})} required />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Travelers *</label>
                    <input type="number" value={formData.num_people} onChange={(e) => setFormData({...formData, num_people: e.target.value})} required min="1" />
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>
                      <option value="draft">Draft</option>
                      <option value="planned">Planned</option>
                      <option value="ongoing">Ongoing</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Total Budget ($) *</label>
                    <input type="number" value={formData.total_budget} onChange={(e) => setFormData({...formData, total_budget: e.target.value})} required min="0" step="0.01" />
                  </div>
                  <div className="form-group">
                    <label>Hotel Budget ($)</label>
                    <input type="number" value={formData.hotel_budget} onChange={(e) => setFormData({...formData, hotel_budget: e.target.value})} min="0" step="0.01" />
                  </div>
                </div>

                <div className="form-group">
                  <label>Notes</label>
                  <textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} rows="2" placeholder="Trip notes..." />
                </div>
              </div>

              {/* Budget Breakdown */}
              <div className="form-section">
                <h3 className="section-title">💰 Budget Planning</h3>
                <div className="budget-breakdown">
                  <div className="budget-item">
                    <span>Activities (estimated)</span>
                    <span className="budget-amount">${selectedActivities.reduce((sum, a) => sum + a.cost, 0).toFixed(2)}</span>
                  </div>
                  <div className="budget-item">
                    <span>Accommodation (40%)</span>
                    <span className="budget-amount">${(parseFloat(formData.budgetAmount || 0) * 0.4).toFixed(2)}</span>
                  </div>
                  <div className="budget-item">
                    <span>Transport (20%)</span>
                    <span className="budget-amount">${(parseFloat(formData.budgetAmount || 0) * 0.2).toFixed(2)}</span>
                  </div>
                  <div className="budget-item">
                    <span>Meals (25%)</span>
                    <span className="budget-amount">${(parseFloat(formData.budgetAmount || 0) * 0.25).toFixed(2)}</span>
                  </div>
                  <div className="budget-item">
                    <span>Others (15%)</span>
                    <span className="budget-amount">${(parseFloat(formData.budgetAmount || 0) * 0.15).toFixed(2)}</span>
                  </div>
                  <div className="budget-item budget-total">
                    <span>Total Budget</span>
                    <span className="budget-amount">${parseFloat(formData.budgetAmount || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {showModal && modalMode === 'schedule' && selectedTrip && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content modal-xlarge" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📅 Schedule Activities - {selectedTrip.tripName}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="schedule-container">
              <div className="schedule-info">
                <p><strong>Duration:</strong> {selectedTrip.duration} days</p>
                <p><strong>Dates:</strong> {selectedTrip.startDate ? new Date(selectedTrip.startDate).toLocaleDateString() : '-'} to {selectedTrip.endDate ? new Date(selectedTrip.endDate).toLocaleDateString() : '-'}</p>
                <p><strong>Budget:</strong> ${selectedTrip.totalBudget}</p>
              </div>

              {/* Day Tabs */}
              <div className="day-tabs">
                {Array.from({ length: selectedTrip.duration }, (_, i) => i + 1).map(day => (
                  <button
                    key={day}
                    className={`day-tab ${scheduleData.day === day ? 'active' : ''}`}
                    onClick={() => setScheduleData({...scheduleData, day})}
                  >
                    Day {day}
                  </button>
                ))}
              </div>

              {/* Time Slots */}
              <div className="time-schedule">
                <h3>⏰ Time & Activity Schedule - Day {scheduleData.day}</h3>
                <div className="time-slots">
                  <div className="time-slot">
                    <span className="time-label">08:00 - 10:00</span>
                    <input type="text" placeholder="Morning activity..." className="activity-input" />
                  </div>
                  <div className="time-slot">
                    <span className="time-label">10:00 - 12:00</span>
                    <input type="text" placeholder="Mid-morning activity..." className="activity-input" />
                  </div>
                  <div className="time-slot">
                    <span className="time-label">12:00 - 14:00</span>
                    <input type="text" placeholder="Lunch & activity..." className="activity-input" />
                  </div>
                  <div className="time-slot">
                    <span className="time-label">14:00 - 16:00</span>
                    <input type="text" placeholder="Afternoon activity..." className="activity-input" />
                  </div>
                  <div className="time-slot">
                    <span className="time-label">16:00 - 18:00</span>
                    <input type="text" placeholder="Evening activity..." className="activity-input" />
                  </div>
                  <div className="time-slot">
                    <span className="time-label">18:00 - 20:00</span>
                    <input type="text" placeholder="Dinner & evening..." className="activity-input" />
                  </div>
                </div>

                {/* Quick Add from Recommended */}
                <div className="quick-add-section">
                  <h4>🎯 Quick Add from Recommended Activities</h4>
                  <div className="quick-activities">
                    {recommendedActivities.slice(0, 6).map(activity => (
                      <button
                        key={activity.id}
                        className="quick-activity-btn"
                        onClick={() => alert(`Add ${activity.name} to schedule`)}
                      >
                        {activity.name}
                        <span className="activity-duration">⏱️ {activity.duration}h</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>
                  Close
                </button>
                <button type="button" className="btn-submit">
                  Save Schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TripItineraryManagement
