import './CrawlJobs.css'

type Job = {
  id: number
  name: string
  jobId: string
  status: 'running' | 'completed' | 'error'
  progress?: number
  details: string
  date?: string
}

const jobs: Job[] = [
  { id: 1, name: 'NVD', jobId: '#1042', status: 'running', progress: 64, details: '128 sayfa · 47 kayıt' },
  { id: 2, name: 'CISA advisories', jobId: '#1041', status: 'completed', details: '212 sayfa · 89 kayıt', date: '11 Ağu, 14:20' },
  { id: 3, name: 'Vendor X blog', jobId: '#1040', status: 'error', details: '3 sayfa · 0 kayıt · 1 hata', date: '11 Ağu, 09:05' },
]

export default function CrawlJobs() {
  return (
    <div className="crawl-page">
      <header className="crawl-header">
        <h2>Crawl jobs</h2>
      </header>

      <div className="jobs-list">
        {jobs.map((j) => (
          <article key={j.id} className="job-card">
            <div className="job-row">
              <div className="job-title">
                <div className="job-name">{j.name} — <span className="job-id">{j.jobId}</span></div>
              </div>

              <div className={`job-status job-status-${j.status}`}>
                {j.status === 'running' && <span className="status-label">Çalışıyor</span>}
                {j.status === 'completed' && <span className="status-label">Tamamlandı</span>}
                {j.status === 'error' && <span className="status-label">Hata</span>}
              </div>
            </div>

            {j.status === 'running' && (
              <>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${j.progress}%` }} />
                </div>
                <div className="job-details">{j.details} · {j.progress}%</div>
              </>
            )}

            {(j.status === 'completed' || j.status === 'error') && (
              <div className="job-details">{j.details} · {j.date}</div>
            )}
          </article>
        ))}
      </div>
    </div>
  )
}
