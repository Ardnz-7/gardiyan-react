import { useEffect, useState } from 'react'
import { getAdvisories, getStats, type Advisory, type Stats } from '../api/client'
import './Dashboard.css'

const emptyText = '—'

function formatValue(value: string | null | undefined) {
  return value && value.trim() ? value : emptyText
}

function severityClass(value: string | null | undefined) {
  const normalized = (value ?? '').trim().toLowerCase()

  switch (normalized) {
    case 'critical':
      return 'critical'
    case 'high':
      return 'high'
    case 'medium':
      return 'medium'
    case 'low':
      return 'low'
    default:
      return 'unknown'
  }
}

const SEVERITY_ROWS: { key: keyof Stats['by_severity']; label: string; fillClass: string }[] = [
  { key: 'critical', label: 'Critical', fillClass: 'fill-danger' },
  { key: 'high', label: 'High', fillClass: 'fill-warning' },
  { key: 'medium', label: 'Medium', fillClass: 'fill-muted' },
  { key: 'low', label: 'Low', fillClass: 'fill-success' },
]

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [advisories, setAdvisories] = useState<Advisory[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true)
      setErrorMessage('')

      try {
        const [statsData, advisoriesData] = await Promise.all([getStats(), getAdvisories()])
        setStats(statsData)
        setAdvisories(advisoriesData)
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load dashboard.')
      } finally {
        setLoading(false)
      }
    }

    void loadDashboard()
  }, [])

  const recentAdvisories = [...advisories]
    .sort((a, b) => new Date(b.collection_date).getTime() - new Date(a.collection_date).getTime())
    .slice(0, 5)

  const maxSeverityCount = stats
    ? Math.max(1, ...SEVERITY_ROWS.map((row) => stats.by_severity[row.key] ?? 0))
    : 1

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <h2>Dashboard</h2>
      </header>

      {loading ? (
        <div className="dashboard-empty">Loading dashboard...</div>
      ) : errorMessage ? (
        <div className="dashboard-error">{errorMessage}</div>
      ) : (
        <>
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-label">Total Advisories</div>
              <div className="stat-value">{stats?.total_advisories ?? 0}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Active Sources</div>
              <div className="stat-value">{stats?.active_sources ?? 0}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Completed Crawls</div>
              <div className="stat-value">{stats?.completed_crawls ?? 0}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Critical</div>
              <div className="stat-value stat-value-critical">{stats?.by_severity.critical ?? 0}</div>
            </div>
          </div>

          <div className="dashboard-panels">
            <div className="panel-card">
              <h3>Severity Breakdown</h3>
              <div className="severity-breakdown">
                {SEVERITY_ROWS.map((row) => {
                  const count = stats?.by_severity[row.key] ?? 0
                  const width = `${(count / maxSeverityCount) * 100}%`

                  return (
                    <div key={row.key} className="severity-row">
                      <div className="severity-label">{row.label}</div>
                      <div className="severity-track">
                        <div className={`severity-fill ${row.fillClass}`} style={{ width }} />
                      </div>
                      <div className="severity-count">{count}</div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="panel-card">
              <h3>Recent Advisories</h3>
              {recentAdvisories.length === 0 ? (
                <div className="dashboard-empty">No advisories yet.</div>
              ) : (
                <div className="recent-list">
                  {recentAdvisories.map((advisory) => (
                    <div key={advisory.id} className="recent-row">
                      <div className="recent-main">
                        <div className="recent-title">{formatValue(advisory.title)}</div>
                        <div className="recent-sub">
                          {formatValue(advisory.cve)} · {formatValue(advisory.organization ?? advisory.source_domain)}
                        </div>
                      </div>
                      <span className={`badge ${severityClass(advisory.severity)}`}>
                        {advisory.severity ? formatValue(advisory.severity) : 'Unknown'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
