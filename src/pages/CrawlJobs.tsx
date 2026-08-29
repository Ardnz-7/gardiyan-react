import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { getCrawlJobs, getSources, startCrawlMulti, type Source } from '../api/client'
import './CrawlJobs.css'

type Job = {
  id: number
  source_id: number
  status: string
  progress: number
  started_at: string
  completed_at: string | null
  pages_visited: number
  records_extracted: number
  error_count: number
  configuration: Record<string, unknown> | null
}

const statusLabels: Record<string, string> = {
  queued: 'Sırada',
  running: 'Çalışıyor',
  stopping: 'Durduruluyor...',
  completed: 'Tamamlandı',
  failed: 'Başarısız',
  stopped: 'Durduruldu',
}

const statusClasses: Record<string, string> = {
  queued: 'job-status-warning',
  running: 'job-status-warning',
  stopping: 'job-status-warning',
  completed: 'job-status-success',
  failed: 'job-status-danger',
  stopped: 'job-status-danger',
}

type CrawlFormState = {
  sourceIds: number[]
  keywords: string
  dateFrom: string
  maximumPages: string
}

const emptyCrawlForm: CrawlFormState = {
  sourceIds: [],
  keywords: '',
  dateFrom: '',
  maximumPages: '',
}

export default function CrawlJobs() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [sources, setSources] = useState<Source[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [crawlForm, setCrawlForm] = useState<CrawlFormState>(emptyCrawlForm)
  const [submitting, setSubmitting] = useState(false)

  const loadJobs = async () => {
    try {
      const data = await getCrawlJobs()
      setJobs(data as Job[])
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load crawl jobs.')
    }
  }

  const loadSources = async () => {
    try {
      const data = await getSources()
      setSources(data)
    } catch (error) {
      setErrorMessage((current) => current || (error instanceof Error ? error.message : 'Unable to load sources.'))
    }
  }

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true)
      setErrorMessage('')
      await Promise.all([loadJobs(), loadSources()])
      setLoading(false)
    }

    void fetchInitialData()

    const intervalId = window.setInterval(() => {
      void loadJobs()
    }, 3000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [])

  const toggleSourceId = (sourceId: number) => {
    setCrawlForm((current) => ({
      ...current,
      sourceIds: current.sourceIds.includes(sourceId)
        ? current.sourceIds.filter((id) => id !== sourceId)
        : [...current.sourceIds, sourceId],
    }))
  }

  const handleCreateJob = async (event: FormEvent) => {
    event.preventDefault()

    if (crawlForm.sourceIds.length === 0) {
      setErrorMessage('Please choose at least one source.')
      return
    }

    setSubmitting(true)
    setErrorMessage('')

    try {
      const keywords = crawlForm.keywords
        .split(',')
        .map((keyword) => keyword.trim())
        .filter((keyword) => keyword.length > 0)

      await startCrawlMulti({
        source_ids: crawlForm.sourceIds,
        keywords: keywords.length > 0 ? keywords : undefined,
        date_from: crawlForm.dateFrom || undefined,
        maximum_pages: crawlForm.maximumPages ? Number(crawlForm.maximumPages) : undefined,
      })
      setShowForm(false)
      setCrawlForm(emptyCrawlForm)
      await loadJobs()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not start crawl.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="crawl-page">
      <header className="crawl-header">
        <h2>Crawl jobs</h2>
      </header>

      <div className="crawl-controls">
        <button type="button" className="crawl-new-button" onClick={() => setShowForm((current) => !current)}>
          + Yeni tarama
        </button>
      </div>

      {showForm && (
        <form className="crawl-form" onSubmit={handleCreateJob}>
          <div className="crawl-field crawl-field-sources">
            <span>Sources</span>
            <div className="source-checkbox-list">
              {sources.length === 0 ? (
                <div className="source-checkbox-empty">No sources available</div>
              ) : (
                sources.map((source) => (
                  <label key={source.id} className="source-checkbox-row">
                    <input
                      type="checkbox"
                      checked={crawlForm.sourceIds.includes(source.id)}
                      onChange={() => toggleSourceId(source.id)}
                    />
                    <span>{source.name}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <label className="crawl-field">
            <span>Keywords (comma-separated)</span>
            <input
              type="text"
              value={crawlForm.keywords}
              onChange={(event) => setCrawlForm((current) => ({ ...current, keywords: event.target.value }))}
              placeholder="e.g. critical, remote code execution"
            />
          </label>

          <label className="crawl-field">
            <span>Date from</span>
            <input
              type="date"
              value={crawlForm.dateFrom}
              onChange={(event) => setCrawlForm((current) => ({ ...current, dateFrom: event.target.value }))}
            />
          </label>

          <label className="crawl-field">
            <span>Maximum pages</span>
            <input
              type="number"
              min="1"
              value={crawlForm.maximumPages}
              onChange={(event) => setCrawlForm((current) => ({ ...current, maximumPages: event.target.value }))}
              placeholder="No limit"
            />
          </label>

          <button type="submit" className="crawl-submit" disabled={submitting || sources.length === 0}>
            {submitting ? 'Başlatılıyor...' : 'Tarama başlat'}
          </button>
        </form>
      )}

      {errorMessage && <div className="job-error">{errorMessage}</div>}

      <div className="jobs-list">
        {loading ? (
          <div className="job-empty">Yükleniyor...</div>
        ) : jobs.length === 0 ? (
          <div className="job-empty">Henüz tarama yok.</div>
        ) : (
          jobs.map((job) => {
            const statusClass = statusClasses[job.status] ?? 'job-status-danger'
            const statusLabel = statusLabels[job.status] ?? job.status

            return (
              <Link key={job.id} to={`/crawl-jobs/${job.id}`} className="job-card-link">
                <article className="job-card">
                  <div className="job-row">
                    <div className="job-title">
                      <div className="job-name">
                        Source #{job.source_id} <span className="job-id"># {job.id}</span>
                      </div>
                    </div>

                    <div className={`job-status ${statusClass}`}>
                      <span className="status-label">{statusLabel}</span>
                    </div>
                  </div>

                  {job.status === 'running' && (
                    <>
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${job.progress}%` }} />
                      </div>
                      <div className="job-details">
                        {job.pages_visited} sayfa · {job.records_extracted} kayıt · {job.progress}%
                      </div>
                    </>
                  )}

                  {job.status !== 'running' && (
                    <div className="job-details">
                      {job.pages_visited} sayfa · {job.records_extracted} kayıt · {job.error_count} hata · {' '}
                      Başlangıç: {new Date(job.started_at).toLocaleString()}
                      {job.completed_at ? ` · Bitiş: ${new Date(job.completed_at).toLocaleString()}` : ''}
                    </div>
                  )}
                </article>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
