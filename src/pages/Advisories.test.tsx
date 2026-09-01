import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Advisories from './Advisories'
import type { Advisory } from '../api/client'

const { getAdvisories } = vi.hoisted(() => ({
  getAdvisories: vi.fn(),
}))

vi.mock('../api/client', () => ({
  getAdvisories,
}))

const sampleAdvisories: Advisory[] = [
  {
    id: 1,
    crawl_job_id: 1,
    title: 'NVD Critical Advisory',
    organization: 'NVD',
    publication_date: '2026-08-01',
    url: 'https://example.com/1',
    source_domain: 'nvd.nist.gov',
    cve: 'CVE-2026-1001',
    product: 'ExampleApp',
    severity: 'Critical',
    summary: 'A critical issue.',
    collection_date: '2026-08-01T00:00:00Z',
  },
  {
    id: 2,
    crawl_job_id: 1,
    title: 'CISA Medium Advisory',
    organization: 'CISA',
    publication_date: '2026-08-02',
    url: 'https://example.com/2',
    source_domain: 'cisa.gov',
    cve: 'CVE-2026-1002',
    product: 'AnotherApp',
    severity: 'Medium',
    summary: 'A medium issue.',
    collection_date: '2026-08-02T00:00:00Z',
  },
  {
    id: 3,
    crawl_job_id: 1,
    title: 'GitHub Low Advisory',
    organization: 'GitHub',
    publication_date: '2026-08-03',
    url: 'https://example.com/3',
    source_domain: 'github.com',
    cve: 'CVE-2026-1003',
    product: 'ThirdApp',
    severity: 'Low',
    summary: 'A low severity issue.',
    collection_date: '2026-08-03T00:00:00Z',
  },
]

// The component auto-selects the first (or first-matching) advisory and renders its title a
// second time in the right-hand detail panel, so list assertions are scoped to .advisory-list
// to avoid ambiguous "multiple elements" matches against the detail panel's copy.
function getList(container: HTMLElement) {
  return container.querySelector('.advisory-list') as HTMLElement
}

describe('Advisories', () => {
  it('renders the advisory list', async () => {
    getAdvisories.mockResolvedValue(sampleAdvisories)

    const { container } = render(<Advisories />)
    await screen.findByText('3 sonuç')

    const list = within(getList(container))
    expect(list.getByText('NVD Critical Advisory')).toBeInTheDocument()
    expect(list.getByText('CISA Medium Advisory')).toBeInTheDocument()
    expect(list.getByText('GitHub Low Advisory')).toBeInTheDocument()
  })

  it('filters the list client-side as the user types a search query', async () => {
    getAdvisories.mockResolvedValue(sampleAdvisories)
    const user = userEvent.setup()

    const { container } = render(<Advisories />)
    await screen.findByText('3 sonuç')

    await user.type(screen.getByPlaceholderText('Ara (CVE, ürün, başlık, kurum...)'), 'GitHub')

    const list = within(getList(container))
    expect(list.getByText('GitHub Low Advisory')).toBeInTheDocument()
    expect(screen.queryByText('NVD Critical Advisory')).not.toBeInTheDocument()
    expect(screen.queryByText('CISA Medium Advisory')).not.toBeInTheDocument()
  })

  it('applies the severity filter server-side', async () => {
    getAdvisories.mockResolvedValue(sampleAdvisories)
    const user = userEvent.setup()

    render(<Advisories />)
    await screen.findByText('3 sonuç')

    await user.selectOptions(screen.getByLabelText('Severity'), 'critical')
    await user.click(screen.getByText('Apply filters'))

    expect(getAdvisories).toHaveBeenLastCalledWith({
      source: undefined,
      severity: 'critical',
      start_date: undefined,
      end_date: undefined,
    })
  })

  it('resets filters and reloads when Clear filters is clicked', async () => {
    getAdvisories.mockResolvedValue(sampleAdvisories)
    const user = userEvent.setup()

    render(<Advisories />)
    await screen.findByText('3 sonuç')

    await user.selectOptions(screen.getByLabelText('Severity'), 'critical')
    await user.click(screen.getByText('Apply filters'))
    await user.click(screen.getByText('Clear filters'))

    expect(getAdvisories).toHaveBeenLastCalledWith(undefined)
  })
})
