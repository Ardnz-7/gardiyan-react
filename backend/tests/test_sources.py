def test_create_source_success(client):
    response = client.post(
        '/api/sources',
        json={'name': 'Test Source', 'base_url': 'https://example.com', 'enabled': True, 'request_delay': 5},
    )
    assert response.status_code == 200
    data = response.json()
    assert data['name'] == 'Test Source'
    assert data['base_url'] == 'https://example.com'
    assert data['enabled'] is True
    assert data['request_delay'] == 5
    assert isinstance(data['id'], int)


def test_create_source_missing_required_field(client):
    response = client.post('/api/sources', json={'name': 'No Base URL'})
    assert response.status_code == 422


def test_create_source_rejects_unsafe_url(client):
    response = client.post(
        '/api/sources',
        json={'name': 'Unsafe Source', 'base_url': 'http://127.0.0.1'},
    )
    assert response.status_code == 400
    assert 'Unsafe URL' in response.json()['detail']


def test_create_source_rejects_duplicate_name(client):
    first = client.post(
        '/api/sources',
        json={'name': 'Duplicate Name', 'base_url': 'https://example.com'},
    )
    assert first.status_code == 200

    second = client.post(
        '/api/sources',
        json={'name': 'Duplicate Name', 'base_url': 'https://example.org'},
    )
    assert second.status_code == 400


def test_list_sources_empty(client):
    response = client.get('/api/sources')
    assert response.status_code == 200
    assert response.json() == []


def test_update_source_partial(client):
    created = client.post(
        '/api/sources',
        json={'name': 'Original Name', 'base_url': 'https://example.com'},
    )
    source_id = created.json()['id']

    response = client.put(f'/api/sources/{source_id}', json={'name': 'New Name'})
    assert response.status_code == 200
    data = response.json()
    assert data['name'] == 'New Name'
    assert data['base_url'] == 'https://example.com'


def test_update_source_status(client):
    created = client.post(
        '/api/sources',
        json={'name': 'Status Toggle', 'base_url': 'https://example.com'},
    )
    source_id = created.json()['id']

    response = client.patch(f'/api/sources/{source_id}/status', json={'enabled': False})
    assert response.status_code == 200
    assert response.json()['enabled'] is False
