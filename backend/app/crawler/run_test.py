import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from app.database import SessionLocal, engine
from app.models.models import Advisory, Base, CrawlJob, Source
from app.crawler.engine import CrawlEngine
from app.crawler.parsers.test_parser import TestParser

Base.metadata.create_all(bind=engine)

session = SessionLocal()
source = session.query(Source).filter_by(name='Test Source').first()
if source is None:
    source = Source(name='Test Source', base_url='https://example.com', enabled=True, request_delay=2)
    session.add(source)
    session.commit()
    session.refresh(source)

engine_runner = CrawlEngine(source=source, parser=TestParser())
job = engine_runner.run()
print(f'CrawlJob status: {job.status}')
print(f'pages_visited={job.pages_visited}, records_extracted={job.records_extracted}, error_count={job.error_count}')

advisories = session.query(Advisory).filter_by(crawl_job_id=job.id).all()
print(f'Created advisory count: {len(advisories)}')
for advisory in advisories:
    print(advisory.title, advisory.cve, advisory.product)

jobs = session.query(CrawlJob).filter_by(source_id=source.id).all()
print(f'Jobs for source: {[(j.id, j.status, j.records_extracted) for j in jobs]}')

engine_runner.close()
session.close()
