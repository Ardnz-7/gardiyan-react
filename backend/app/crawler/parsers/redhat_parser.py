import json

from app.crawler.base import Parser

SEVERITY_MAP = {
    'low': 'Low',
    'moderate': 'Medium',
    'important': 'High',
    'critical': 'Critical',
}


class RedHatParser(Parser):
    def parse(self, html: str, url: str) -> list[dict]:
        data = json.loads(html)
        records: list[dict] = []

        for item in data:
            try:
                cve_id = item['CVE']
                title = item.get('bugzilla_description') or cve_id
                public_date = item.get('public_date', '')
                severity = item.get('severity')

                records.append({
                    'title': title,
                    'organization': 'Red Hat',
                    'publication_date': public_date[:10] if public_date else None,
                    'url': f'https://access.redhat.com/security/cve/{cve_id}',
                    'source_domain': 'access.redhat.com',
                    'cve': cve_id,
                    'product': None,
                    'severity': SEVERITY_MAP.get(severity.lower()) if severity else None,
                    'summary': title,
                    'collection_date': None,
                })
            except (KeyError, TypeError, AttributeError):
                continue

        return records
