import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getCrawlJob, getLogs, stopCrawl, type CrawlJob, type CrawlLog } from '../api/client'
import './CrawlJobs.css'
import './Logs.css'
import './CrawlDetails.css'

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

const ACTIVE_STATUSES = new Set(['queued', 'running'])

export default function CrawlDetails() {
  const { id } = useParams<{ id: string }>()
  const jobId = Number(id)

  const [job, setJob] = useState<CrawlJob | null>(null)
  const [logs, setLogs] = useState<CrawlLog[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [stopping, setStopping] = useState(false)

  const loadJob = async () => {
    try {
      const data = await getCrawlJob(jobId)
      setJob(data)
      setNotFound(false)
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        setNotFound(true)
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load crawl job.')
      }
    }
  }

  const loadLogs = async () => {
    try {
      const data = await getLogs({ crawl_job_id: jobId })
      setLogs(data)
    } catch (error) {
      setErrorMessage((current) => current || (error instanceof Error ? error.message : 'Unable to load logs.'))
    }
  }

  useEffect(() => {
    if (!id || Number.isNaN(jobId)) {
      setNotFound(true)
      setLoading(false)
      return
    }

    const fetchInitialData = async () => {
      setLoading(true)
      setErrorMessage('')
      await Promise.all([loadJob(), loadLogs()])
      setLoading(false)
    }

    void fetchInitialData()

    const intervalId = window.setInterval(() => {
      if (job && !ACTIVE_STATUSES.has(job.status)) {
        return
      }
      void loadJob()
      void loadLogs()
    }, 3000)

    return () => {
      window.clearInterval(intervalId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, job?.status])

  const handleStop = async () => {
    if (!job) return

    setStopping(true)
    setErrorMessage('')

    try {
      await stopCrawl(job.id)
      await loadJob()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not stop crawl.')
    } finally {
      setStopping(false)
    }
  }

  return (
    <div className="crawl-page">
      <div className="crawl-details-back">
        <Link to="/crawl-jobs">← Back to Crawl Jobs</Link>
      </div>

      {loading ? (
        <div className="job-empty">Yükleniyor...</div>
      ) : notFound ? (
        <div className="job-error">Job not found.</div>
      ) : (
        <>
          {errorMessage && <div className="job-error">{errorMessage}</div>}

          {job && (
            <>
              <article className="job-card">
                <div className="job-row">
                  <div className="job-title">
                    <div className="job-name">
                      Source #{job.source_id} <span className="job-id"># {job.id}</span>
                    </div>
                  </div>

                  <div className={`job-status ${statusClasses[job.status] ?? 'job-status-danger'}`}>
                    <span className="status-label">{statusLabels[job.status] ?? job.status}</span>
                  </div>
                </div>

                {job.status === 'running' && (
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${job.progress}%` }} />
                  </div>
                )}

                <div className="job-details">
                  {job.pages_visited} sayfa · {job.records_extracted} kayıt · {job.error_count} hata · {job.progress}%
                </div>
                <div className="job-details">
                  Başlangıç: {new Date(job.started_at).toLocaleString()}
                  {job.completed_at ? ` · Bitiş: ${new Date(job.completed_at).toLocaleString()}` : ''}
                </div>

                {ACTIVE_STATUSES.has(job.status) && (
                  <div className="crawl-details-actions">
                    <button type="button" className="crawl-stop-button" onClick={handleStop} disabled={stopping}>
                      {stopping ? 'Durduruluyor...' : 'Stop'}
                    </button>
                  </div>
                )}
              </article>

              <h3 className="crawl-details-logs-title">Logs</h3>
              {logs.length === 0 ? (
                <div className="job-empty">Henüz log kaydı yok.</div>
              ) : (
                <div className="logs-stream">
                  {logs.map((log) => (
                    <div key={log.id} className={`log-row ${(log.log_level ?? '').toLowerCase()}`}>
                      <div className="log-timestamp">{new Date(log.timestamp).toLocaleString()}</div>
                      <div className="log-level">{log.log_level ?? '—'}</div>
                      <div className="log-source">{log.source ?? '—'}</div>
                      <div className="log-message">{log.message ?? '—'}</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
