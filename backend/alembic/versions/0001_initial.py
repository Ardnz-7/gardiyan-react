"""initial

Revision ID: 0001_initial
Revises: 
Create Date: 2026-08-11 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0001_initial'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'source',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('name', sa.String(length=255), nullable=False, unique=True),
        sa.Column('base_url', sa.String(length=2048), nullable=True),
        sa.Column('enabled', sa.Boolean, nullable=False, server_default=sa.text('1')),
        sa.Column('request_delay', sa.Integer, nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime, nullable=False),
        sa.Column('updated_at', sa.DateTime, nullable=False),
        sa.Column('last_crawl_at', sa.DateTime, nullable=True),
    )

    op.create_table(
        'crawl_job',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('source_id', sa.Integer, sa.ForeignKey('source.id'), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('progress', sa.Integer, nullable=False, server_default='0'),
        sa.Column('started_at', sa.DateTime, nullable=False),
        sa.Column('completed_at', sa.DateTime, nullable=True),
        sa.Column('pages_visited', sa.Integer, nullable=False, server_default='0'),
        sa.Column('records_extracted', sa.Integer, nullable=False, server_default='0'),
        sa.Column('error_count', sa.Integer, nullable=False, server_default='0'),
        sa.Column('configuration', sa.JSON, nullable=True),
    )

    op.create_table(
        'advisory',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('crawl_job_id', sa.Integer, sa.ForeignKey('crawl_job.id'), nullable=False),
        sa.Column('title', sa.String(length=1000), nullable=False),
        sa.Column('organization', sa.String(length=255), nullable=True),
        sa.Column('publication_date', sa.Date, nullable=True),
        sa.Column('url', sa.String(length=2048), nullable=True),
        sa.Column('source_domain', sa.String(length=255), nullable=True),
        sa.Column('cve', sa.String(length=64), nullable=True),
        sa.Column('product', sa.String(length=255), nullable=True),
        sa.Column('severity', sa.String(length=50), nullable=True),
        sa.Column('summary', sa.Text, nullable=True),
        sa.Column('collection_date', sa.DateTime, nullable=False),
    )

    op.create_table(
        'crawl_log',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('crawl_job_id', sa.Integer, sa.ForeignKey('crawl_job.id'), nullable=False),
        sa.Column('timestamp', sa.DateTime, nullable=False),
        sa.Column('log_level', sa.String(length=50), nullable=True),
        sa.Column('message', sa.Text, nullable=True),
        sa.Column('source', sa.String(length=255), nullable=True),
    )


def downgrade():
    op.drop_table('crawl_log')
    op.drop_table('advisory')
    op.drop_table('crawl_job')
    op.drop_table('source')
