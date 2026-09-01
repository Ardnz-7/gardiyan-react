import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import CrawlJobs from './CrawlJobs'
import type { CrawlJob, Source } from '../api/client'

const { getCrawlJobs, getSources, startCrawlMulti } = vi.hoisted(() => ({
  getCrawlJobs: vi.fn(),
  getSources: vi.fn(),
  startCrawlMulti: vi.fn(),
}))

vi.mock('../api/client', () => ({
  getCrawlJobs,
  getSources,
  startCrawlMulti,
}))

function renderCrawlJobs() {
  return render(
    <MemoryRouter>
      <CrawlJobs />
    </MemoryRouter>,
  )
}

const sampleSource: Source = {
  id: 7,
  name: 'NVD',
  base_url: 'https://services.nvd.nist.gov/rest/json/cves/2.0',
  enabled: true,
  request_delay: 2,
  created_at: '2026-08-01T00:00:00Z',
  updated_at: '2026-08-01T00:00:00Z',
  last_crawl_at: null,
}

const sampleJobs: CrawlJob[] = [
  {
    id: 1,
    source_id: 7,
    status: 'running',
    progress: 40,
    started_at: '2026-08-01T00:00:00Z',
    completed_at: null,
    pages_visited: 1,
    records_extracted: 5,
    error_count: 0,
    configuration: null,
  },
  {
    id: 2,
    source_id: 7,
    status: 'completed',
    progress: 100,
    started_at: '2026-08-01T00:00:00Z',
    completed_at: '2026-08-01T00:05:00Z',
    pages_visited: 1,
    records_extracted: 20,
    error_count: 0,
    configuration: null,
  },
]

describe('CrawlJobs', () => {
  it('shows a loading indicator while data is pending', () => {
    getCrawlJobs.mockReturnValue(new Promise(() => {}))
    getSources.mockReturnValue(new Promise(() => {}))

    renderCrawlJobs()

    expect(screen.getByText('Yükleniyor...')).toBeInTheDocument()
  })

  it('renders the job list with status labels', async () => {
    getCrawlJobs.mockResolvedValue(sampleJobs)
    getSources.mockResolvedValue([sampleSource])

    renderCrawlJobs()

    expect(await screen.findByText('Çalışıyor')).toBeInTheDocument()
    expect(screen.getByText('Tamamlandı')).toBeInTheDocument()
  })

  it('requires at least one source before submitting', async () => {
    getCrawlJobs.mockResolvedValue([])
    getSources.mockResolvedValue([sampleSource])
    const user = userEvent.setup()

    renderCrawlJobs()

    await user.click(await screen.findByText('+ Yeni tarama'))
    await screen.findByText('NVD')
    await user.click(screen.getByText('Tarama başlat'))

    expect(await screen.findByText('Please choose at least one source.')).toBeInTheDocument()
    expect(startCrawlMulti).not.toHaveBeenCalled()
  })

  it('submits selected sources and parsed keywords', async () => {
    getCrawlJobs.mockResolvedValue([])
    getSources.mockResolvedValue([sampleSource])
    startCrawlMulti.mockResolvedValue({ job_id: 99, status: 'queued' })
    const user = userEvent.setup()

    renderCrawlJobs()

    await user.click(await screen.findByText('+ Yeni tarama'))
    await screen.findByText('NVD')
    await user.click(screen.getByRole('checkbox'))
    await user.type(screen.getByPlaceholderText('e.g. critical, remote code execution'), 'critical, rce')
    await user.click(screen.getByText('Tarama başlat'))

    expect(startCrawlMulti).toHaveBeenCalledWith({
      source_ids: [7],
      keywords: ['critical', 'rce'],
      date_from: undefined,
      maximum_pages: undefined,
    })
  })

  it('shows a progress bar only for the running job', async () => {
    const jobs: CrawlJob[] = [
      { ...sampleJobs[0], progress: 65 },
      sampleJobs[1],
    ]
    getCrawlJobs.mockResolvedValue(jobs)
    getSources.mockResolvedValue([sampleSource])

    const { container } = renderCrawlJobs()

    expect(await screen.findByText((text) => text.includes('65%'))).toBeInTheDocument()
    expect(container.querySelectorAll('.progress-track')).toHaveLength(1)
  })
})
