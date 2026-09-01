from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy.exc import IntegrityError

from app.database import SessionLocal
from app.models.models import Advisory


@pytest.fixture()
def seed_advisories(test_db):
    """Insert a handful of Advisory rows directly via SQLAlchemy, bypassing the crawler
    entirely, so filtering/pagination tests don't need real network calls or HTML fixtures.
    """
    session = SessionLocal()
    now = datetime.now(timezone.utc)
    advisories = [
        Advisory(
            crawl_job_id=1, title='Advisory 1', source_domain='nvd.nist.gov',
            cve='CVE-2026-0001', severity='Critical', collection_date=now - timedelta(days=4),
        ),
        Advisory(
            crawl_job_id=1, title='Advisory 2', source_domain='nvd.nist.gov',
            cve='CVE-2026-0002', severity='High', collection_date=now - timedelta(days=3),
        ),
        Advisory(
            crawl_job_id=1, title='Advisory 3', source_domain='cisa.gov',
            cve='CVE-2026-0003', severity='Medium', collection_date=now - timedelta(days=2),
        ),
        Advisory(
            crawl_job_id=1, title='Advisory 4', source_domain='cisa.gov',
            cve='CVE-2026-0004', severity='Low', collection_date=now - timedelta(days=1),
        ),
        Advisory(
            crawl_job_id=1, title='Advisory 5', source_domain='github.com',
            cve='CVE-2026-0005', severity='Critical', collection_date=now,
        ),
    ]
    session.add_all(advisories)
    session.commit()
    for advisory in advisories:
        session.refresh(advisory)
    ids = [advisory.id for advisory in advisories]
    session.close()
    return ids


def test_list_advisories_pagination(client, seed_advisories):
    first_page = client.get('/api/advisories', params={'limit': 2})
    assert first_page.status_code == 200
    first_ids = [item['id'] for item in first_page.json()]
    assert len(first_ids) == 2

    second_page = client.get('/api/advisories', params={'limit': 2, 'offset': 2})
    assert second_page.status_code == 200
    second_ids = [item['id'] for item in second_page.json()]
    assert len(second_ids) == 2

    assert set(first_ids).isdisjoint(second_ids)


def test_list_advisories_severity_filter(client, seed_advisories):
    response = client.get('/api/advisories', params={'severity': 'critical'})
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert all(item['severity'] == 'Critical' for item in data)


def test_list_advisories_source_filter(client, seed_advisories):
    response = client.get('/api/advisories', params={'source': 'cisa'})
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert all(item['source_domain'] == 'cisa.gov' for item in data)


def test_get_advisory_404(client):
    response = client.get('/api/advisories/99999')
    assert response.status_code == 404


def test_delete_advisory(client, test_db):
    session = SessionLocal()
    advisory = Advisory(
        crawl_job_id=1, title='To Delete', source_domain='example.com',
        cve='CVE-2026-9000', severity='Low', collection_date=datetime.now(timezone.utc),
    )
    session.add(advisory)
    session.commit()
    session.refresh(advisory)
    advisory_id = advisory.id
    session.close()

    delete_response = client.delete(f'/api/advisories/{advisory_id}')
    assert delete_response.status_code == 204

    get_response = client.get(f'/api/advisories/{advisory_id}')
    assert get_response.status_code == 404


def test_duplicate_handling(test_db):
    session = SessionLocal()
    session.add(Advisory(
        crawl_job_id=1, title='Original', source_domain='duplicate.example',
        cve='CVE-2026-9999', collection_date=datetime.now(timezone.utc),
    ))
    session.commit()

    session.add(Advisory(
        crawl_job_id=1, title='Duplicate', source_domain='duplicate.example',
        cve='CVE-2026-9999', collection_date=datetime.now(timezone.utc),
    ))
    with pytest.raises(IntegrityError):
        session.commit()
    session.rollback()
    session.close()
