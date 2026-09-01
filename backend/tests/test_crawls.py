import httpx


def test_create_crawl_requires_source(client):
    response = client.post('/api/crawls', json={})
    assert response.status_code == 400


def test_create_crawl_404_on_missing_source(client):
    response = client.post('/api/crawls', json={'source_id': 99999})
    assert response.status_code == 404


def test_create_crawl_returns_job_id(client, monkeypatch):
    def fake_get(*args, **kwargs):
        raise httpx.ConnectError('network disabled in tests')

    # engine.py and robots.py both call httpx.get(...) directly (not `from httpx import get`),
    # so patching the attribute on the httpx module itself covers both the robots.txt fetch
    # and the page fetch — the crawl's background task (run synchronously by TestClient) fails
    # fast through the existing except-Exception paths instead of touching the real network.
    monkeypatch.setattr(httpx, 'get', fake_get)

    source = client.post(
        '/api/sources',
        json={'name': 'Crawl Target', 'base_url': 'https://example.com'},
    )
    source_id = source.json()['id']

    response = client.post('/api/crawls', json={'source_id': source_id})
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data['job_id'], int)

    job_response = client.get(f"/api/crawls/{data['job_id']}")
    assert job_response.status_code == 200
    assert job_response.json()['status'] in ('queued', 'running', 'completed', 'failed')


def test_get_crawl_404(client):
    response = client.get('/api/crawls/99999')
    assert response.status_code == 404


def test_stop_nonexistent_crawl_404(client):
    response = client.post('/api/crawls/99999/stop')
    assert response.status_code == 404
