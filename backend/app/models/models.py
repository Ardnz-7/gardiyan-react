from datetime import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    Date,
    Boolean,
    ForeignKey,
    JSON,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship, declarative_base

Base = declarative_base()


class Source(Base):
    __tablename__ = "source"

    id = Column(Integer, primary_key=True)
    name = Column(String(255), unique=True, nullable=False)
    base_url = Column(String(2048), nullable=True)
    enabled = Column(Boolean, nullable=False, default=True)
    request_delay = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    last_crawl_at = Column(DateTime, nullable=True)

    crawl_jobs = relationship("CrawlJob", back_populates="source")


class CrawlJob(Base):
    __tablename__ = "crawl_job"

    id = Column(Integer, primary_key=True)
    source_id = Column(Integer, ForeignKey("source.id"), nullable=False)
    status = Column(String(50), nullable=False)
    progress = Column(Integer, nullable=False, default=0)
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    pages_visited = Column(Integer, nullable=False, default=0)
    records_extracted = Column(Integer, nullable=False, default=0)
    error_count = Column(Integer, nullable=False, default=0)
    configuration = Column(JSON, nullable=True)

    source = relationship("Source", back_populates="crawl_jobs")
    advisories = relationship("Advisory", back_populates="crawl_job")
    logs = relationship("CrawlLog", back_populates="crawl_job")


class Advisory(Base):
    __tablename__ = "advisory"
    __table_args__ = (
        UniqueConstraint('cve', 'source_domain', name='uq_advisory_cve_source_domain'),
    )

    id = Column(Integer, primary_key=True)
    crawl_job_id = Column(Integer, ForeignKey("crawl_job.id"), nullable=False)
    title = Column(String(1000), nullable=False)
    organization = Column(String(255), nullable=True)
    publication_date = Column(Date, nullable=True)
    url = Column(String(2048), nullable=True)
    source_domain = Column(String(255), nullable=True)
    cve = Column(String(64), nullable=True, index=True)
    product = Column(String(255), nullable=True)
    severity = Column(String(50), nullable=True)
    summary = Column(Text, nullable=True)
    collection_date = Column(DateTime, default=datetime.utcnow, nullable=False)

    crawl_job = relationship("CrawlJob", back_populates="advisories")


class CrawlLog(Base):
    __tablename__ = "crawl_log"

    id = Column(Integer, primary_key=True)
    crawl_job_id = Column(Integer, ForeignKey("crawl_job.id"), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    log_level = Column(String(50), nullable=True)
    message = Column(Text, nullable=True)
    source = Column(String(255), nullable=True)

    crawl_job = relationship("CrawlJob", back_populates="logs")
