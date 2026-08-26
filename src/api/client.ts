export const API_BASE_URL = 'http://localhost:8000' as const

export type Source = {
  id: number
  name: string
  base_url: string | null
  enabled: boolean
  request_delay: number
  created_at: string
  updated_at: string
  last_crawl_at: string | null
}

export type CreateSourceInput = {
  name: string
  base_url: string
  enabled?: boolean
  request_delay?: number
}

export type UpdateSourceInput = Partial<CreateSourceInput>

export type CrawlJob = {
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

export type Advisory = {
  id: number
  crawl_job_id: number
  title: string
  organization: string | null
  publication_date: string | null
  url: string | null
  source_domain: string | null
  cve: string | null
  product: string | null
  severity: string | null
  summary: string | null
  collection_date: string
}

export type CrawlLog = {
  id: number
  crawl_job_id: number
  timestamp: string
  log_level: string | null
  message: string | null
  source: string | null
}

export type Stats = {
  total_advisories: number
  by_severity: Record<string, number>
  active_sources: number
  completed_crawls: number
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  params?: Record<string, string | number | boolean | null | undefined>,
): Promise<T> {
  const url = new URL(`${API_BASE_URL}${path}`)

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        url.searchParams.set(key, String(value))
      }
    })
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  })

  const rawText = await response.text()
  const parsedBody = rawText ? JSON.parse(rawText) : null

  if (!response.ok) {
    const detail = parsedBody && typeof parsedBody === 'object' && 'detail' in parsedBody
      ? JSON.stringify(parsedBody.detail)
      : rawText || response.statusText
    throw new Error(`Request failed (${response.status}): ${detail}`)
  }

  return (parsedBody ?? undefined) as T
}

export async function getSources(): Promise<Source[]> {
  return request<Source[]>('/api/sources')
}

export async function createSource(data: CreateSourceInput): Promise<Source> {
  return request<Source>('/api/sources', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateSource(id: number, data: UpdateSourceInput): Promise<Source> {
  return request<Source>(`/api/sources/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function updateSourceStatus(id: number, enabled: boolean): Promise<Source> {
  return request<Source>(`/api/sources/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ enabled }),
  })
}

export async function getCrawlJobs(): Promise<CrawlJob[]> {
  return request<CrawlJob[]>('/api/crawls')
}

export async function getCrawlJob(id: number): Promise<CrawlJob> {
  return request<CrawlJob>(`/api/crawls/${id}`)
}

export async function startCrawl(sourceId: number): Promise<{ job_id: number; status: string }> {
  return request<{ job_id: number; status: string }>('/api/crawls', {
    method: 'POST',
    body: JSON.stringify({ source_id: sourceId }),
  })
}

export async function getAdvisories(
  params?: Record<string, string | number | boolean | null | undefined>,
): Promise<Advisory[]> {
  return request<Advisory[]>('/api/advisories', {}, params)
}

export async function getStats(): Promise<Stats> {
  return request<Stats>('/api/stats')
}

export async function getLogs(
  params?: Record<string, string | number | boolean | null | undefined>,
): Promise<CrawlLog[]> {
  return request<CrawlLog[]>('/api/logs', {}, params)
}
