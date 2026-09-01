import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Dashboard from './Dashboard'
import type { Advisory, Stats } from '../api/client'

const { getStats, getAdvisories } = vi.hoisted(() => ({
  getStats: vi.fn(),
  getAdvisories: vi.fn(),
}))

vi.mock('../api/client', () => ({
  getStats,
  getAdvisories,
}))

const sampleStats: Stats = {
  total_advisories: 42,
  by_severity: { critical: 5, high: 10, medium: 15, low: 12 },
  active_sources: 3,
  completed_crawls: 8,
}

const sampleAdvisories: Advisory[] = [
  {
    id: 1,
    crawl_job_id: 1,
    title: 'Example Advisory',
    organization: 'NVD',
    publication_date: '2026-08-01',
    url: 'https://example.com/advisory/1',
    source_domain: 'nvd.nist.gov',
    cve: 'CVE-2026-00001',
    product: 'ExampleApp',
    severity: 'Critical',
    summary: 'A summary.',
    collection_date: '2026-08-01T00:00:00Z',
  },
]

describe('Dashboard', () => {
  it('shows a loading indicator while data is pending', () => {
    getStats.mockReturnValue(new Promise(() => {}))
    getAdvisories.mockReturnValue(new Promise(() => {}))

    render(<Dashboard />)

    expect(screen.getByText('Loading dashboard...')).toBeInTheDocument()
  })

  it('renders stats after load', async () => {
    getStats.mockResolvedValue(sampleStats)
    getAdvisories.mockResolvedValue(sampleAdvisories)

    render(<Dashboard />)

    expect(await screen.findByText('42')).toBeInTheDocument()
  })

  it('shows an error state when loading fails', async () => {
    getStats.mockRejectedValue(new Error('Boom'))
    getAdvisories.mockResolvedValue([])

    render(<Dashboard />)

    expect(await screen.findByText('Boom')).toBeInTheDocument()
  })
})
