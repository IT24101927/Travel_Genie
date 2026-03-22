import { useState, useEffect, useCallback } from 'react'
import './DistrictManagement.css'
import { API_BASE } from '../../config/api'

const API = API_BASE
const authH = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
})

function DistrictManagement({ theme }) {
  const [districts, setDistricts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toastMsg, setToastMsg] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState('add')
  const [selectedDistrict, setSelectedDistrict] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('name')

  const [formData, setFormData] = useState({ name: '', province: '', description: '', highlights: '', best_for: '', image_url: '' })
  const [formErrors, setFormErrors] = useState({})
  const [imageMode, setImageMode] = useState('url') // 'url' | 'file'
  const [pendingFile, setPendingFile] = useState(null)
  const [filePreview, setFilePreview] = useState(null)

  const showToast = (msg) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 3000)
  }

  // ── Load ─────────────────────────────────────────────────────────────────
  const loadDistricts = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API}/districts`)
      const data = await res.json()
      if (data.success) setDistricts(data.data)
      else setError(data.message || 'Failed to load districts')
    } catch {
      setError('Cannot connect to server.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadDistricts() }, [loadDistricts])

  // ── Helpers ───────────────────────────────────────────────────────────────
  const validate = () => {
    const errs = {}
    if (!formData.name.trim()) errs.name = 'Name is required'
    if (formData.name.trim().length > 100) errs.name = 'Name must be ≤ 100 characters'
    if (formData.province.length > 100) errs.province = 'Province must be ≤ 100 characters'
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  const resetForm = () => {
    setFormData({ name: '', province: '', description: '', highlights: '', best_for: '', image_url: '' })
    setFormErrors({})
    setImageMode('url')
    setPendingFile(null)
    setFilePreview(null)
  }


  // ── Open Edit ─────────────────────────────────────────────────────────────
  const handleEdit = (district) => {
    setModalMode('edit')
    setSelectedDistrict(district)
    setFormData({
      name: district.name || '',
      province: district.province || '',
      description: district.description || '',
      highlights: Array.isArray(district.highlights) ? district.highlights.join(', ') : (district.highlights || ''),
      best_for: Array.isArray(district.best_for) ? district.best_for.join(', ') : (district.best_for || ''),
      image_url: district.image_url || '',
    })
    setImageMode('url')
    setPendingFile(null)
    setFilePreview(null)
    setFormErrors({})
    setShowModal(true)
  }

  // ── Submit (Update) ──────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      let finalImageUrl = formData.image_url.trim() || null

      // If user picked a file, upload it first
      if (imageMode === 'file' && pendingFile) {
        const fd = new FormData()
        fd.append('image', pendingFile)
        const uploadRes = await fetch(`${API}/districts/${selectedDistrict.district_id}/image`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          body: fd,
        })
        const uploadData = await uploadRes.json()
        if (!uploadData.success) {
          setError(uploadData.message || 'Image upload failed')
          return
        }
        finalImageUrl = uploadData.data.image_url
      }

      const body = {
        name: formData.name.trim(),
        province: formData.province.trim(),
        description: formData.description.trim() || null,
        highlights: formData.highlights.trim()
          ? formData.highlights.split(',').map(h => h.trim()).filter(Boolean)
          : null,
        best_for: formData.best_for.trim()
          ? formData.best_for.split(',').map(h => h.trim()).filter(Boolean)
          : null,
        image_url: finalImageUrl,
      }
      const res = await fetch(`${API}/districts/${selectedDistrict.district_id}`, { method: 'PUT', headers: authH(), body: JSON.stringify(body) })
      const data = await res.json()
      if (data.success) { showToast('✅ District updated'); await loadDistricts(); setShowModal(false) }
      else setError(data.message || data.error || 'Failed to update district')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return
    try {
      const res = await fetch(`${API}/districts/${deleteConfirm.district_id}`, { method: 'DELETE', headers: authH() })
      const data = await res.json()
      if (data.success) {
        showToast('✅ District deleted')
        setDistricts(prev => prev.filter(d => d.district_id !== deleteConfirm.district_id))
      } else {
        setError(data.message || data.error || 'Failed to delete district')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setDeleteConfirm(null)
    }
  }

  // ── Filter & Sort ─────────────────────────────────────────────────────────
  const filtered = districts
    .filter(d => {
      const q = searchQuery.toLowerCase()
      return d.name.toLowerCase().includes(q) || (d.province || '').toLowerCase().includes(q)
    })
    .sort((a, b) => {
      if (sortBy === 'province') return (a.province || '').localeCompare(b.province || '')
      if (sortBy === 'places') return (parseInt(b.place_count) || 0) - (parseInt(a.place_count) || 0)
      return a.name.localeCompare(b.name)
    })

  // Group by province for the stat card
  const provinceCount = [...new Set(districts.map(d => d.province).filter(Boolean))].length
  const totalPlaces = districts.reduce((sum, d) => sum + (parseInt(d.place_count) || 0), 0)

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="district-management">
      {/* Toast */}
      {toastMsg && <div className="admin-toast">{toastMsg}</div>}

      {/* Error Banner */}
      {error && (
        <div className="admin-error-banner">
          {error}
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}

      {/* Header */}
      <div className="dm2-header">
        <div>
          <h1 className="dm2-title">District Management</h1>
          <p className="dm2-subtitle">Update and organise districts by province</p>
        </div>
      </div>

      {/* Stats */}
      <div className="dm2-stats">
        <div className="dm2-stat-card">
          <div className="dm2-stat-icon" style={{ background: 'linear-gradient(135deg, #6366f1, #818cf8)' }}>🗺️</div>
          <div>
            <p className="dm2-stat-value">{loading ? '…' : districts.length}</p>
            <p className="dm2-stat-label">Total Districts</p>
          </div>
        </div>
        <div className="dm2-stat-card">
          <div className="dm2-stat-icon" style={{ background: 'linear-gradient(135deg, #10b981, #34d399)' }}>📌</div>
          <div>
            <p className="dm2-stat-value">{loading ? '…' : provinceCount}</p>
            <p className="dm2-stat-label">Provinces</p>
          </div>
        </div>
        <div className="dm2-stat-card">
          <div className="dm2-stat-icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #fbbf24)' }}>🏙️</div>
          <div>
            <p className="dm2-stat-value">{loading ? '…' : totalPlaces}</p>
            <p className="dm2-stat-label">Total Places</p>
          </div>
        </div>
        <div className="dm2-stat-card">
          <div className="dm2-stat-icon" style={{ background: 'linear-gradient(135deg, #ec4899, #f472b6)' }}>🔍</div>
          <div>
            <p className="dm2-stat-value">{filtered.length}</p>
            <p className="dm2-stat-label">Showing</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="dm2-toolbar">
        <div className="dm2-search-wrap">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search districts or provinces…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="dm2-search-input"
          />
          {searchQuery && (
            <button className="dm2-search-clear" onClick={() => setSearchQuery('')}>✕</button>
          )}
        </div>
        <div className="dm2-sort-wrap">
          <label>Sort by:</label>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="dm2-select">
            <option value="name">Name (A–Z)</option>
            <option value="province">Province (A–Z)</option>
            <option value="places">Most Places</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="dm2-table-wrap">
        {loading ? (
          <div className="dm2-loading">
            <div className="dm2-spinner" />
            <span>Loading districts…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="dm2-empty">
            <span className="dm2-empty-icon">🗺️</span>
            <p>{searchQuery ? 'No districts match your search.' : 'No districts found.'}</p>
          </div>
        ) : (
          <table className="dm2-table">
            <thead>
              <tr>
                <th>#</th>
                <th>District Name</th>
                <th>Province</th>
                <th>Places</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((district, idx) => (
                <tr key={district.district_id}>
                  <td className="dm2-td-index">{idx + 1}</td>
                  <td>
                    <div className="dm2-name-cell">
                      {district.image_url ? (
                        <img src={district.image_url} alt={district.name} className="dm2-thumb" />
                      ) : (
                        <div className="dm2-avatar">{district.name[0].toUpperCase()}</div>
                      )}
                      <span className="dm2-name">{district.name}</span>
                    </div>
                  </td>
                  <td>
                    {district.province ? (
                      <span className="dm2-province-badge">{district.province}</span>
                    ) : (
                      <span className="dm2-no-data">—</span>
                    )}
                  </td>
                  <td>
                    <span className="dm2-count-badge">{parseInt(district.place_count) || 0}</span>
                  </td>
                  <td>
                    <div className="dm2-actions">
                      <button
                        className="dm2-action-btn edit"
                        onClick={() => handleEdit(district)}
                        title="Edit district"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                        Edit
                      </button>
                      <button
                        className="dm2-action-btn delete"
                        onClick={() => setDeleteConfirm(district)}
                        title="Delete district"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                          <path d="M10 11v6"/><path d="M14 11v6"/>
                          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                        </svg>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ─── Edit Modal ───────────────────────────────────────────────────────── */}
      {showModal && (
        <div className="dm2-modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="dm2-modal">
            <div className="dm2-modal-header">
              <h2>✏️ Edit District</h2>
              <button className="dm2-modal-close" onClick={() => setShowModal(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="dm2-form" noValidate>
              {/* District Name */}
              <div className={`dm2-form-group ${formErrors.name ? 'has-error' : ''}`}>
                <label>
                  District Name <span className="dm2-required">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Galle"
                  value={formData.name}
                  onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                  maxLength={100}
                  autoFocus
                />
                {formErrors.name && <span className="dm2-field-error">{formErrors.name}</span>}
              </div>

              {/* Province */}
              <div className={`dm2-form-group ${formErrors.province ? 'has-error' : ''}`}>
                <label>Province</label>
                <input
                  type="text"
                  placeholder="e.g. Southern Province"
                  value={formData.province}
                  onChange={e => setFormData(p => ({ ...p, province: e.target.value }))}
                  maxLength={100}
                />
                {formErrors.province && <span className="dm2-field-error">{formErrors.province}</span>}
              </div>

              {/* Description */}
              <div className="dm2-form-group">
                <label>Description</label>
                <textarea
                  className="dm2-textarea"
                  placeholder="A short description shown on the district card…"
                  value={formData.description}
                  onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                  rows={3}
                  maxLength={500}
                />
                <span className="dm2-char-hint-inline">{formData.description.length}/500</span>
              </div>

              {/* Highlights */}
              <div className="dm2-form-group">
                <label>Highlights <span className="dm2-label-hint">(comma-separated)</span></label>
                <input
                  type="text"
                  placeholder="e.g. Galle Fort, Jungle Beach, Dutch Church"
                  value={formData.highlights}
                  onChange={e => setFormData(p => ({ ...p, highlights: e.target.value }))}
                />
                {formData.highlights.trim() && (
                  <div className="dm2-chip-preview">
                    {formData.highlights.split(',').map(h => h.trim()).filter(Boolean).map((h, i) => (
                      <span key={i} className="dm2-chip">{h}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Best For */}
              <div className="dm2-form-group">
                <label>Best For <span className="dm2-label-hint">(comma-separated)</span></label>
                <input
                  type="text"
                  placeholder="e.g. Beach, History, Culture, Hiking"
                  value={formData.best_for}
                  onChange={e => setFormData(p => ({ ...p, best_for: e.target.value }))}
                />
                {formData.best_for.trim() && (
                  <div className="dm2-chip-preview">
                    {formData.best_for.split(',').map(h => h.trim()).filter(Boolean).map((h, i) => (
                      <span key={i} className="dm2-chip dm2-chip-green">{h}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Image */}
              <div className="dm2-form-group">
                <label>District Image</label>
                <div className="dm2-img-toggle">
                  <button type="button" className={`dm2-img-tab ${imageMode === 'url' ? 'active' : ''}`} onClick={() => { setImageMode('url'); setPendingFile(null); setFilePreview(null) }}>🔗 URL</button>
                  <button type="button" className={`dm2-img-tab ${imageMode === 'file' ? 'active' : ''}`} onClick={() => setImageMode('file')}>📁 Upload File</button>
                </div>

                {imageMode === 'url' ? (
                  <input
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    value={formData.image_url}
                    onChange={e => setFormData(p => ({ ...p, image_url: e.target.value }))}
                  />
                ) : (
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="dm2-file-input"
                    onChange={e => {
                      const file = e.target.files[0]
                      if (!file) return
                      setPendingFile(file)
                      setFilePreview(URL.createObjectURL(file))
                    }}
                  />
                )}

                {/* Preview */}
                {(imageMode === 'url' && formData.image_url) && (
                  <img src={formData.image_url} alt="preview" className="dm2-img-preview" onError={e => e.target.style.display='none'} />
                )}
                {(imageMode === 'file' && filePreview) && (
                  <img src={filePreview} alt="preview" className="dm2-img-preview" />
                )}
              </div>

              {/* Character counters */}
              <div className="dm2-char-hints">
                <span>{formData.name.length}/100</span>
                <span>{formData.province.length}/100</span>
              </div>

              {/* Footer */}
              <div className="dm2-modal-footer">
                <button type="button" className="dm2-btn-cancel" onClick={() => setShowModal(false)} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="dm2-btn-save" disabled={saving}>
                  {saving ? (
                    <>
                      <span className="dm2-btn-spinner" />
                      Saving…
                    </>
                  ) : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Delete Confirm Dialog ────────────────────────────────────────── */}
      {deleteConfirm && (
        <div className="dm2-modal-overlay" onClick={(e) => e.target === e.currentTarget && setDeleteConfirm(null)}>
          <div className="dm2-modal dm2-modal-sm">
            <div className="dm2-modal-header">
              <h2>🗑️ Delete District</h2>
              <button className="dm2-modal-close" onClick={() => setDeleteConfirm(null)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="dm2-delete-body">
              <div className="dm2-delete-icon">⚠️</div>
              <p>Are you sure you want to delete <strong>{deleteConfirm.name}</strong>?</p>
              <p className="dm2-delete-warning">
                This action cannot be undone. Deleting a district may affect related places, destinations, and hotels.
              </p>
            </div>
            <div className="dm2-modal-footer">
              <button className="dm2-btn-cancel" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="dm2-btn-danger" onClick={handleDeleteConfirm}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DistrictManagement
