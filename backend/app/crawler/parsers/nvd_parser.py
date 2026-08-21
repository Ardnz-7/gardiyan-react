import json

from app.crawler.base import Parser


class NVDParser(Parser):
    def parse(self, html: str, url: str) -> list[dict]:
        data = json.loads(html)
        records: list[dict] = []

        for item in data.get('vulnerabilities', []):
            try:
                cve = item['cve']
                cve_id = cve['id']
                summary = next(
                    description['value']
                    for description in cve.get('descriptions', [])
                    if description.get('lang') == 'en'
                )
                published = cve.get('published')
                severity = self._severity(cve)
                references = cve.get('references', [])
                reference_url = next(
                    reference['url']
                    for reference in references
                    if reference.get('url')
                ) if references else url

                records.append({
                    'title': cve_id,
                    'organization': 'NVD',
                    'publication_date': published[:10] if published else None,
                    'url': reference_url,
                    'source_domain': 'nvd.nist.gov',
                    'cve': cve_id,
                    'product': None,
                    'severity': severity,
                    'summary': summary,
                    'collection_date': None,
                })
            except (KeyError, TypeError, StopIteration, IndexError):
                continue

        return records

    @staticmethod
    def _severity(cve: dict) -> str | None:
        metrics = cve.get('metrics', {})
        for metric_name in ('cvssMetricV31', 'cvssMetricV30', 'cvssMetricV2'):
            metrics_for_version = metrics.get(metric_name, [])
            if not metrics_for_version:
                continue
            base_severity = metrics_for_version[0].get('cvssData', {}).get('baseSeverity')
            if base_severity:
                return base_severity.title()
        return None
