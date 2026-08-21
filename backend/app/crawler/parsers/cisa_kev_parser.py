import json

from app.crawler.base import Parser


class CISAKEVParser(Parser):
    def parse(self, html: str, url: str) -> list[dict]:
        data = json.loads(html)
        vulnerabilities = data.get('vulnerabilities', [])
        recent_vulnerabilities = sorted(
            vulnerabilities,
            key=lambda item: item.get('dateAdded') or '',
            reverse=True,
        )[:20]
        records: list[dict] = []

        for item in recent_vulnerabilities:
            try:
                cve_id = item['cveID']
                vendor = item.get('vendorProject') or ''
                product = item.get('product') or ''
                product_name = ' '.join(part for part in (vendor, product) if part).strip() or None
                records.append({
                    'title': item['vulnerabilityName'],
                    'organization': 'CISA',
                    'publication_date': item.get('dateAdded'),
                    'url': f'https://www.cisa.gov/known-exploited-vulnerabilities-catalog?field_cve={cve_id}',
                    'source_domain': 'cisa.gov',
                    'cve': cve_id,
                    'product': product_name,
                    'severity': None,
                    'summary': item.get('shortDescription'),
                    'collection_date': None,
                })
            except (KeyError, TypeError):
                continue

        return records
