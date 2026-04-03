import { useState, useEffect, useCallback } from 'react'
import './DistrictManagement.css'
import { API_BASE } from '../../config/api'
import { validateUrl } from '../../utils/validation'

const API = API_BASE

const toAbsoluteAssetUrl = (value) => {
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return value
  const normalizedBase = API.replace(/\/api\/?$/, '')
  const normalizedPath = value.startsWith('/') ? value : `/${value}`
  return `${normalizedBase}${normalizedPath}`
}

const authH = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
})

// ── Province colour map (like TYPE_COLOURS in DestinationManagement) ──────
const _PC = {
  western:      { bg: '#6366f1', text: '#fff' },
  central:      { bg: '#10b981', text: '#fff' },
  southern:     { bg: '#f59e0b', text: '#fff' },
  northern:     { bg: '#ef4444', text: '#fff' },
  eastern:      { bg: '#3b82f6', text: '#fff' },
  nw:           { bg: '#a855f7', text: '#fff' },
  nc:           { bg: '#ec4899', text: '#fff' },
  uva:          { bg: '#ca8a04', text: '#fff' },
  sabaragamuwa: { bg: '#0d9488', text: '#fff' },
}

const PROVINCE_COLOURS = {
  // full names (DB may store either form)
  'Western Province':       _PC.western,
  'Central Province':       _PC.central,
  'Southern Province':      _PC.southern,
  'Northern Province':      _PC.northern,
  'Eastern Province':       _PC.eastern,
  'North Western Province': _PC.nw,
  'North Central Province': _PC.nc,
  'Uva Province':           _PC.uva,
  'Sabaragamuwa Province':  _PC.sabaragamuwa,
  // short names (common DB format)
  'Western':       _PC.western,
  'Central':       _PC.central,
  'Southern':      _PC.southern,
  'Northern':      _PC.northern,
  'Eastern':       _PC.eastern,
  'North Western': _PC.nw,
  'North Central': _PC.nc,
  'Uva':           _PC.uva,
  'Sabaragamuwa':  _PC.sabaragamuwa,
}

const PROVINCE_EMOJIS = {
  'Western Province': '🌆',
  'Central Province': '🏔️',
  'Southern Province': '🏖️',
  'Northern Province': '🌿',
  'Eastern Province': '🌊',
  'North Western Province': '🌴',
  'North Central Province': '🏛️',
  'Uva Province': '🍃',
  'Sabaragamuwa Province': '💎',
}

const PROVINCE_IMAGES = {
  'Western Province':       'https://images.unsplash.com/photo-1588416936097-41850ab3d86d?w=400&q=80',
  'Central Province':       'https://images.unsplash.com/photo-1586861203927-800a5acdcc4d?w=400&q=80',
  'Southern Province':      'https://images.unsplash.com/photo-1590123551977-3f7d9ded5a41?w=400&q=80',
  'Northern Province':      'https://images.unsplash.com/photo-1568454537842-d933259bb258?w=400&q=80',
  'Eastern Province':       'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=400&q=80',
  'North Western Province': 'https://images.unsplash.com/photo-1596178060671-7a80dc8059ea?w=400&q=80',
  'North Central Province': 'https://images.unsplash.com/photo-1617526738882-1ea945ce3e56?w=400&q=80',
  'Uva Province':           'https://images.unsplash.com/photo-1562602833-0f4ab2fc46e3?w=400&q=80',
  'Sabaragamuwa Province':  'https://images.unsplash.com/photo-1567095761054-7a02e69e5c43?w=400&q=80',
}

const DISTRICT_PLACEHOLDER = 'https://images.unsplash.com/photo-1523731407965-2430cd12f5e4?w=400&q=80'

function DistrictManagement() {
  const [districts, setDistricts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toastMsg, setToastMsg] = useState(null)

  const [showModal, setShowModal] = useState(false)
  const [selectedDistrict, setSelectedDistrict] = useState(null)
  const [saving, setSaving] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('name')

  const [formData, setFormData] = useState({ name: '', province: '', description: '', highlights: '', best_for: '', image_url: '' })
  const [formErrors, setFormErrors] = useState({})
  const [imageMode, setImageMode] = useState('url') // 'url' | 'file'
  const [pendingFile, setPendingFile] = useState(null)
  const [filePreview, setFilePreview] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToastMsg({ msg, type })
    setTimeout(() => setToastMsg(null), 3000)
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
    const name = formData.name.trim()
    if (!name) {
      errs.name = 'District name is required.'
    } else if (name.length < 2) {
      errs.name = 'Name must be at least 2 characters.'
    } else if (name.length > 100) {
      errs.name = 'Name must be ≤ 100 characters.'
    } else if (/\d/.test(name)) {
      errs.name = 'District name cannot contain numbers.'
    } else if (/[^a-zA-Z\u00C0-\u024F\u1E00-\u1EFF\s.\-']/.test(name)) {
      errs.name = 'Name can only contain letters, spaces, hyphens, and apostrophes.'
    }

    const province = formData.province.trim()
    if (province) {
      if (province.length > 100) {
        errs.province = 'Province must be ≤ 100 characters.'
      } else if (/\d/.test(province)) {
        errs.province = 'Province name cannot contain numbers.'
      } else if (/[^a-zA-Z\u00C0-\u024F\u1E00-\u1EFF\s.\-']/.test(province)) {
        errs.province = 'Province can only contain letters, spaces, hyphens, and apostrophes.'
      }
    }

    if (formData.description.trim().length > 500) {
      errs.description = 'Description must be ≤ 500 characters.'
    }

    if (imageMode === 'url' && formData.image_url.trim()) {
      const urlCheck = validateUrl(formData.image_url.trim())
      if (!urlCheck.valid) errs.image_url = urlCheck.message
    }

    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  // ── Open Edit ─────────────────────────────────────────────────────────────
  const handleEdit = (district) => {
    setSelectedDistrict(district)
    setFormData({
      name: district.name || '',
      province: district.province || '',
      description: district.description || '',
      highlights: Array.isArray(district.highlights) ? district.highlights.join(', ') : (district.highlights || ''),
      best_for: Array.isArray(district.best_for) ? district.best_for.join(', ') : (district.best_for || ''),
      image_url: toAbsoluteAssetUrl(district.image_url) || '',
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
      if (data.success) { showToast('✅ District updated'); const savedScroll = window.scrollY; await loadDistricts(); setShowModal(false); window.requestAnimationFrame(() => window.scrollTo({ top: savedScroll, behavior: 'instant' })) }
      else setError(data.message || data.error || 'Failed to update district')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSaving(false)
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

  // Province pill style (like typePillStyle in DestinationManagement)
  const provincePillStyle = (province) => {
    const c = PROVINCE_COLOURS[province] || { bg: '#6b7280', text: '#fff' }
    return { background: c.bg, color: c.text }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="district-management">
      {/* Toast */}
      {toastMsg && <div className={`admin-toast ${toastMsg.type}`}>{toastMsg.msg}</div>}

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

      {/* Card Grid */}
      <div className="dm2-card-grid-outer">
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
          <div className="dm2-card-grid">
            {filtered.map(district => {
              const img = toAbsoluteAssetUrl(district.image_url) || PROVINCE_IMAGES[district.province] || DISTRICT_PLACEHOLDER
              const highlights = Array.isArray(district.highlights) ? district.highlights : []
              const bestFor = Array.isArray(district.best_for) ? district.best_for : []
              return (
                <div key={district.district_id} className="dm2-district-card">
                  <div className="dm2-card-img-wrap">
                    <img
                      src={img}
                      alt={district.name}
                      className="dm2-card-img"
                      onError={e => { e.target.src = DISTRICT_PLACEHOLDER }}
                    />
                    {district.province && (
                      <span className="dm2-province-pill" style={provincePillStyle(district.province)}>
                        {PROVINCE_EMOJIS[district.province] || '📍'} {district.province}
                      </span>
                    )}
                    <span className="dm2-places-badge">
                      🏙️ {parseInt(district.place_count) || 0} places
                    </span>
                  </div>
                  <div className="dm2-card-body">
                    <h3 className="dm2-card-name">{district.name}</h3>
                    {district.description && (
                      <p className="dm2-card-desc">
                        {district.description.length > 100
                          ? district.description.slice(0, 100) + '…'
                          : district.description}
                      </p>
                    )}
                    {highlights.length > 0 && (
                      <div className="dm2-card-chips">
                        {highlights.slice(0, 3).map((h, i) => (
                          <span key={i} className="dm2-chip">{h}</span>
                        ))}
                      </div>
                    )}
                    {bestFor.length > 0 && (
                      <div className="dm2-card-chips">
                        {bestFor.slice(0, 3).map((b, i) => (
                          <span key={i} className="dm2-chip dm2-chip-green">{b}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="dm2-card-footer">
                    <div className="dm2-card-actions">
                      <button className="dm-btn-edit" onClick={() => handleEdit(district)} title="Edit">✏️ Edit</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
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
              {/* District Name + Province — side by side */}
              <div className="dm2-form-row">
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
              </div>

              {/* Description */}
              <div className={`dm2-form-group ${formErrors.description ? 'has-error' : ''}`}>
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
                {formErrors.description && <span className="dm2-field-error">{formErrors.description}</span>}
              </div>

              {/* Highlights + Best For — side by side */}
              <div className="dm2-form-row">
                <div className="dm2-form-group">
                  <label>Highlights <span className="dm2-label-hint">(comma-separated)</span></label>
                  <input
                    type="text"
                    placeholder="e.g. Galle Fort, Jungle Beach"
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

                <div className="dm2-form-group">
                  <label>Best For <span className="dm2-label-hint">(comma-separated)</span></label>
                  <input
                    type="text"
                    placeholder="e.g. Beach, History, Hiking"
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
              </div>

              {/* Image */}
              <div className="dm2-form-group">
                <label>District Image</label>
                <div className="dm2-img-toggle">
                  <button type="button" className={`dm2-img-tab ${imageMode === 'url' ? 'active' : ''}`} onClick={() => { setImageMode('url'); setPendingFile(null); setFilePreview(null) }}>🔗 URL</button>
                  <button type="button" className={`dm2-img-tab ${imageMode === 'file' ? 'active' : ''}`} onClick={() => setImageMode('file')}>📁 Upload File</button>
                </div>

                {imageMode === 'url' ? (
                  <>
                    <input
                      type="url"
                      placeholder="https://example.com/image.jpg"
                      value={formData.image_url}
                      onChange={e => setFormData(p => ({ ...p, image_url: e.target.value }))}
                      className={formErrors.image_url ? 'dm2-input-error' : ''}
                    />
                    {formErrors.image_url && <span className="dm2-field-error">{formErrors.image_url}</span>}
                  </>
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
                  <img key={formData.image_url} src={formData.image_url} alt="preview" className="dm2-img-preview" onError={e => e.target.style.display='none'} />
                )}
                {(imageMode === 'file' && filePreview) && (
                  <img src={filePreview} alt="preview" className="dm2-img-preview" />
                )}
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


    </div>
  )
}

export default DistrictManagement
