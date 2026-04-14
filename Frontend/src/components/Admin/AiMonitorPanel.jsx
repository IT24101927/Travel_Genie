import { useEffect, useMemo, useState } from 'react'
import { API_BASE } from '../../config/api'

function pct(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '0%'
  return `${Math.round(n * 100)}%`
}

function safeNum(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function Doughnut({ value = 0, color = '#0e7c5f', track = '#e2e8f0' }) {
  const p = Math.max(0, Math.min(100, Math.round(safeNum(value) * 100)))
  return (
    <div
      className="ai-donut"
      style={{
        background: `conic-gradient(${color} ${p}%, ${track} ${p}% 100%)`,
      }}
      aria-label={`Availability ${p}%`}
    >
      <span>{p}%</span>
    </div>
  )
}

export default function AiMonitorPanel() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [serviceStats, setServiceStats] = useState([])

  const authH = useMemo(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  }), [])

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const services = [
        { key: 'budget', label: 'Budget AI', color: '#0e7c5f', base: `${API_BASE}/budget` },
        { key: 'hotel', label: 'Hotel AI', color: '#2563eb', base: `${API_BASE}/hotels` },
        { key: 'place', label: 'Place AI', color: '#7c3aed', base: `${API_BASE}/places` },
      ]

      const settled = await Promise.all(services.map(async (service) => {
        try {
          const [metricsRes, healthRes] = await Promise.all([
            fetch(`${service.base}/ai-monitor`, { headers: authH }),
            fetch(`${service.base}/ai-service-health`, { headers: authH }),
          ])
          const metricsJson = metricsRes.ok ? await metricsRes.json() : null
          const healthJson = healthRes.ok ? await healthRes.json() : null

          if (!metricsJson?.success) {
            return {
              ...service,
              failed: true,
              error: metricsJson?.message || 'Failed to load metrics',
              metrics: null,
              health: null,
            }
          }

          return {
            ...service,
            failed: false,
            metrics: metricsJson.metrics || {},
            health: healthJson?.health || { status: 'unknown' },
          }
        } catch {
          return {
            ...service,
            failed: true,
            error: 'Service is unavailable',
            metrics: null,
            health: null,
          }
        }
      }))

      setServiceStats(settled)

      const hasAnyData = settled.some((s) => !!s.metrics)
      if (!hasAnyData) {
        setError('AI monitor is currently unavailable.')
      }
    } catch {
      setError('AI monitor is currently unavailable.')
      setServiceStats([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const totals = useMemo(() => {
    return serviceStats.reduce((acc, service) => {
      const m = service.metrics || {}
      acc.totalRequests += safeNum(m.totalRequests)
      acc.successfulResponses += safeNum(m.successfulResponses)
      acc.unavailableResponses += safeNum(m.unavailableResponses)
      acc.timeoutResponses += safeNum(m.timeoutResponses)
      acc.invalidResponses += safeNum(m.invalidResponses)
      return acc
    }, {
      totalRequests: 0,
      successfulResponses: 0,
      unavailableResponses: 0,
      timeoutResponses: 0,
      invalidResponses: 0,
    })
  }, [serviceStats])

  const overallAvailability = totals.totalRequests > 0
    ? totals.successfulResponses / totals.totalRequests
    : 0

  return (
    <section className="adm-section adm-card ai-monitor-panel">
      <div className="adm-section-header">
        <h3>🤖 AI Monitor</h3>
        <button className="adm-link-btn" onClick={load}>Refresh</button>
      </div>

      {loading && (
        <div className="admin-loading" style={{ padding: '28px 0' }}>
          <div className="admin-spinner" />
          <p>Loading AI monitor…</p>
        </div>
      )}

      {!loading && error && (
        <div className="admin-error-banner">
          <span>{error}</span>
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="ai-monitor-grid ai-monitor-grid-top">
            <article className="ai-monitor-stat">
              <span>Services tracked</span>
              <strong>{serviceStats.length}</strong>
            </article>
            <article className="ai-monitor-stat">
              <span>Overall availability</span>
              <strong>{pct(overallAvailability)}</strong>
            </article>
            <article className="ai-monitor-stat">
              <span>Total AI requests</span>
              <strong>{totals.totalRequests.toLocaleString()}</strong>
            </article>
            <article className="ai-monitor-stat">
              <span>Total failures</span>
              <strong>{(totals.unavailableResponses + totals.timeoutResponses + totals.invalidResponses).toLocaleString()}</strong>
            </article>
          </div>

          <div className="ai-monitor-charts">
            <article className="ai-chart-card">
              <h4>Availability by Service</h4>
              <div className="ai-donut-row">
                {serviceStats.map((service) => (
                  <div className="ai-donut-item" key={service.key}>
                    <Doughnut value={service.metrics?.availabilityRate || 0} color={service.color} />
                    <span className="ai-donut-label">{service.label}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="ai-chart-card">
              <h4>Request Volume</h4>
              <div className="ai-bars">
                {serviceStats.map((service) => {
                  const val = safeNum(service.metrics?.totalRequests)
                  const max = Math.max(1, ...serviceStats.map((s) => safeNum(s.metrics?.totalRequests)))
                  const width = Math.round((val / max) * 100)
                  return (
                    <div className="ai-bar-row" key={`${service.key}-bar`}>
                      <span>{service.label}</span>
                      <div className="ai-bar-track">
                        <div className="ai-bar-fill" style={{ width: `${width}%`, background: service.color }} />
                      </div>
                      <strong>{val.toLocaleString()}</strong>
                    </div>
                  )
                })}
              </div>
            </article>
          </div>

          <div className="ai-monitor-table-wrap">
            <table className="ai-monitor-table">
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Health</th>
                  <th>Availability</th>
                  <th>Requests</th>
                  <th>Success</th>
                  <th>Unavailable</th>
                  <th>Timeout</th>
                  <th>Invalid</th>
                </tr>
              </thead>
              <tbody>
                {serviceStats.map((service) => {
                  const m = service.metrics || {}
                  const healthStatus = service.health?.status || 'unknown'
                  return (
                    <tr key={`${service.key}-row`}>
                      <td>{service.label}</td>
                      <td>
                        <span className={healthStatus === 'ok' ? 'ai-ok' : 'ai-bad'}>{healthStatus}</span>
                      </td>
                      <td>{pct(m.availabilityRate)}</td>
                      <td>{safeNum(m.totalRequests).toLocaleString()}</td>
                      <td>{safeNum(m.successfulResponses).toLocaleString()}</td>
                      <td>{safeNum(m.unavailableResponses).toLocaleString()}</td>
                      <td>{safeNum(m.timeoutResponses).toLocaleString()}</td>
                      <td>{safeNum(m.invalidResponses).toLocaleString()}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}
