import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { getCrawlJobs, getSources, startCrawl, type Source } from '../api/client'
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
  completed: 'Tamamlandı',
  failed: 'Başarısız',
  stopped: 'Durduruldu',
}

const statusClasses: Record<string, string> = {
  queued: 'job-status-warning',
  running: 'job-status-warning',
  completed: 'job-status-success',
  failed: 'job-status-danger',
  stopped: 'job-status-danger',
}

export default function CrawlJobs() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [sources, setSources] = useState<Source[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [selectedSourceId, setSelectedSourceId] = useState<number | ''>('')
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
      if (data.length > 0 && selectedSourceId === '') {
        setSelectedSourceId(data[0].id)
      }
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

  const handleCreateJob = async (event: FormEvent) => {
    event.preventDefault()

    if (!selectedSourceId) {
      setErrorMessage('Please choose a source.')
      return
    }

    setSubmitting(true)
    setErrorMessage('')

    try {
      await startCrawl(Number(selectedSourceId))
      setShowForm(false)
      setSelectedSourceId(sources[0]?.id ?? '')
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
          <label>
            <span>Source</span>
            <select
              value={selectedSourceId}
              onChange={(event) => setSelectedSourceId(Number(event.target.value))}
            >
              {sources.length === 0 ? (
                <option value="">No sources available</option>
              ) : (
                sources.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.name}
                  </option>
                ))
              )}
            </select>
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
              <article key={job.id} className="job-card">
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
            )
          })
        )}
      </div>
    </div>
  )
}
