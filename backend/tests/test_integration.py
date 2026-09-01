import json
from pathlib import Path

import httpx

FIXTURES_DIR = Path(__file__).parent / 'fixtures'


class FakeResponse:
    def __init__(self, text, status_code=200):
        self.text = text
        self.status_code = status_code

    def raise_for_status(self):
        pass


def test_full_crawl_flow(client, monkeypatch):
    nvd_fixture_text = (FIXTURES_DIR / 'nvd_sample.json').read_text(encoding='utf-8')
    fixture_record_count = len(json.loads(nvd_fixture_text)['vulnerabilities'])

    def fake_get(url, *args, **kwargs):
        # robots.py and engine.py both call httpx.get(...) directly, so one patched function
        # has to serve both call sites: return a permissive empty robots.txt for the
        # robots.txt fetch, and the NVD fixture content for the actual page fetch.
        if url.endswith('/robots.txt'):
            return FakeResponse('', status_code=200)
        return FakeResponse(nvd_fixture_text, status_code=200)

    monkeypatch.setattr(httpx, 'get', fake_get)

    source_response = client.post(
        '/api/sources',
        json={
            'name': 'NVD Integration Test',
            'base_url': 'https://services.nvd.nist.gov/rest/json/cves/2.0',
        },
    )
    assert source_response.status_code == 200
    source_id = source_response.json()['id']

    crawl_response = client.post('/api/crawls', json={'source_id': source_id})
    assert crawl_response.status_code == 200
    job_id = crawl_response.json()['job_id']

    job_status = client.get(f'/api/crawls/{job_id}')
    assert job_status.status_code == 200
    job_data = job_status.json()
    assert job_data['status'] == 'completed'
    assert job_data['records_extracted'] == fixture_record_count

    advisories_response = client.get('/api/advisories')
    assert advisories_response.status_code == 200
    advisories = advisories_response.json()
    assert len(advisories) == fixture_record_count

    first_cve = next(item for item in advisories if item['cve'] == 'CVE-2026-12345')
    assert first_cve['severity'] == 'Critical'

    logs_response = client.get('/api/logs', params={'crawl_job_id': job_id})
    assert logs_response.status_code == 200
    logs = logs_response.json()
    assert any(log['message'] == 'job completed' for log in logs)
