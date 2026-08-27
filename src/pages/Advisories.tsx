import { useEffect, useMemo, useState } from 'react'
import { getAdvisories, type Advisory } from '../api/client'
import './Advisories.css'

const emptyText = '—'

const SEVERITY_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
  { value: 'unknown', label: 'Unknown' },
] as const

type SeverityFilter = (typeof SEVERITY_OPTIONS)[number]['value']

function formatDate(value: string | null | undefined) {
  if (!value) return emptyText

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString()
}

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

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function downloadCsv(advisories: Advisory[]) {
  const columns: (keyof Advisory)[] = [
    'title',
    'organization',
    'publication_date',
    'severity',
    'cve',
    'product',
    'source_domain',
    'url',
  ]

  const header = columns.join(',')
  const rows = advisories.map((advisory) =>
    columns.map((column) => csvEscape(advisory[column] ? String(advisory[column]) : '')).join(','),
  )
  const csvContent = [header, ...rows].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const dateStamp = new Date().toISOString().slice(0, 10)

  const link = document.createElement('a')
  link.href = url
  link.download = `advisories-export-${dateStamp}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export default function Advisories() {
  const [advisories, setAdvisories] = useState<Advisory[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const [sourceFilter, setSourceFilter] = useState('')
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all')
  const [startDateFilter, setStartDateFilter] = useState('')
  const [endDateFilter, setEndDateFilter] = useState('')

  const loadAdvisories = async (params?: Record<string, string | undefined>) => {
    setLoading(true)
    setErrorMessage('')

    try {
      const data = await getAdvisories(params)
      setAdvisories(data)
      setSelectedId((current) => {
        if (data.length === 0) return null
        if (!current || !data.some((item) => item.id === current)) {
          return data[0].id
        }
        return current
      })
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load advisories.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadAdvisories()
  }, [])

  const handleApplyFilters = () => {
    void loadAdvisories({
      source: sourceFilter.trim() || undefined,
      severity: severityFilter === 'all' || severityFilter === 'unknown' ? undefined : severityFilter,
      start_date: startDateFilter || undefined,
      end_date: endDateFilter || undefined,
    })
  }

  const handleClearFilters = () => {
    setSourceFilter('')
    setSeverityFilter('all')
    setStartDateFilter('')
    setEndDateFilter('')
    void loadAdvisories()
  }

  const filteredAdvisories = useMemo(() => {
    let result = advisories

    if (severityFilter === 'unknown') {
      result = result.filter((item) => !item.severity || !item.severity.trim())
    }

    const normalizedQuery = query.trim().toLowerCase()
    if (normalizedQuery) {
      result = result.filter((item) => {
        const haystack = [item.title, item.cve, item.product, item.organization]
          .filter((value): value is string => Boolean(value))
          .join(' ')
          .toLowerCase()

        return haystack.includes(normalizedQuery)
      })
    }

    return result
  }, [advisories, query, severityFilter])

  useEffect(() => {
    if (!filteredAdvisories.some((item) => item.id === selectedId)) {
      setSelectedId(filteredAdvisories[0]?.id ?? null)
    }
  }, [filteredAdvisories, selectedId])

  const selected = filteredAdvisories.find((item) => item.id === selectedId) ?? null

  return (
    <div className="advisories-page">
      <div className="left-col">
        <div className="filters-panel">
          <label className="filter-field">
            <span>Source</span>
            <input
              type="text"
              value={sourceFilter}
              onChange={(event) => setSourceFilter(event.target.value)}
              placeholder="e.g. cisa.gov"
            />
          </label>

          <label className="filter-field">
            <span>Severity</span>
            <select value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value as SeverityFilter)}>
              {SEVERITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="filter-date-row">
            <label className="filter-field">
              <span>Start date</span>
              <input
                type="date"
                value={startDateFilter}
                onChange={(event) => setStartDateFilter(event.target.value)}
              />
            </label>
            <label className="filter-field">
              <span>End date</span>
              <input
                type="date"
                value={endDateFilter}
                onChange={(event) => setEndDateFilter(event.target.value)}
              />
            </label>
          </div>

          <div className="filter-actions">
            <button type="button" className="filter-apply" onClick={handleApplyFilters}>
              Apply filters
            </button>
            <button type="button" className="filter-clear" onClick={handleClearFilters}>
              Clear filters
            </button>
          </div>
        </div>

        <div className="search-wrap">
          <input
            className="search-input"
            placeholder="Ara (CVE, ürün, başlık, kurum...)"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div className="list-toolbar">
          <span className="result-count">{filteredAdvisories.length} sonuç</span>
          <button
            type="button"
            className="export-csv"
            onClick={() => downloadCsv(filteredAdvisories)}
            disabled={filteredAdvisories.length === 0}
          >
            Export CSV
          </button>
        </div>

        {loading ? (
          <div className="advisories-empty">Yükleniyor...</div>
        ) : errorMessage ? (
          <div className="advisories-error">{errorMessage}</div>
        ) : filteredAdvisories.length === 0 ? (
          <div className="advisories-empty">Henüz güvenlik uyarısı bulunmuyor.</div>
        ) : (
          <div className="advisory-list">
            {filteredAdvisories.map((item) => (
              <div
                key={item.id}
                className={`advisory-card ${item.id === selectedId ? 'selected' : ''}`}
                onClick={() => setSelectedId(item.id)}
              >
                <div className="advisory-title">{formatValue(item.title)}</div>
                <div className="advisory-sub">
                  {formatValue(item.cve)} · {formatValue(item.source_domain)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="right-col">
        {selected ? (
          <>
            <div className="detail-header">
              <h2 className="detail-title">{formatValue(selected.title)}</h2>
              <span className={`badge ${severityClass(selected.severity)}`}>
                {selected.severity ? formatValue(selected.severity) : 'Bilinmiyor'}
              </span>
            </div>

            <div className="meta-line">
              <span>{formatValue(selected.cve)}</span>
              <span>·</span>
              <span>{formatValue(selected.source_domain)}</span>
              <span>·</span>
              <span>Yayın: {formatDate(selected.publication_date)}</span>
              <span>·</span>
              <span>Toplandı: {formatDate(selected.collection_date)}</span>
            </div>

            <div className="info-grid">
              <div className="info-item">
                <div className="info-key">Organization</div>
                <div className="info-val">{formatValue(selected.organization)}</div>
              </div>
              <div className="info-item">
                <div className="info-key">Product</div>
                <div className="info-val">{formatValue(selected.product)}</div>
              </div>
            </div>

            <div className="summary">
              <p>{formatValue(selected.summary)}</p>
            </div>

            <div className="external-link">
              {selected.url ? (
                <a href={selected.url} target="_blank" rel="noreferrer">
                  ↗ Orijinal kaynağı görüntüle
                </a>
              ) : (
                <span>Orijinal kaynak mevcut değil.</span>
              )}
            </div>
          </>
        ) : (
          <div className="advisories-empty detail-empty">Seçili bir güvenlik uyarısı yok.</div>
        )}
      </div>
    </div>
  )
}
