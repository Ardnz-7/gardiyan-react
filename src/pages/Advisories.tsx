import { useEffect, useMemo, useState } from 'react'
import { getAdvisories, type Advisory } from '../api/client'
import './Advisories.css'

const emptyText = '—'

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

export default function Advisories() {
  const [advisories, setAdvisories] = useState<Advisory[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const loadAdvisories = async () => {
      setLoading(true)
      setErrorMessage('')

      try {
        const data = await getAdvisories()
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

    void loadAdvisories()
  }, [])

  const filteredAdvisories = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    if (!normalizedQuery) {
      return advisories
    }

    return advisories.filter((item) => {
      const haystack = [item.title, item.cve, item.product]
        .filter((value): value is string => Boolean(value))
        .join(' ')
        .toLowerCase()

      return haystack.includes(normalizedQuery)
    })
  }, [advisories, query])

  useEffect(() => {
    if (!filteredAdvisories.some((item) => item.id === selectedId)) {
      setSelectedId(filteredAdvisories[0]?.id ?? null)
    }
  }, [filteredAdvisories, selectedId])

  const selected = filteredAdvisories.find((item) => item.id === selectedId) ?? null

  return (
    <div className="advisories-page">
      <div className="left-col">
        <div className="search-wrap">
          <input
            className="search-input"
            placeholder="Ara (CVE, ürün, başlık...)"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
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

