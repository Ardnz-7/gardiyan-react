import json

from app.crawler.base import Parser


class GitHubAdvisoriesParser(Parser):
    def parse(self, html: str, url: str) -> list[dict]:
        data = json.loads(html)
        records: list[dict] = []

        for item in data:
            try:
                title = item['summary']
                published_at = item.get('published_at', '')
                product = self._product(item.get('vulnerabilities', []))
                severity = item.get('severity')
                summary = item.get('description') or title

                records.append({
                    'title': title,
                    'organization': 'GitHub',
                    'publication_date': published_at[:10] if published_at else None,
                    'url': item['html_url'],
                    'source_domain': 'github.com',
                    'cve': item.get('cve_id'),
                    'product': product,
                    'severity': severity.title() if severity else None,
                    'summary': summary[:1000],
                    'collection_date': None,
                })
            except (KeyError, TypeError, IndexError):
                continue

        return records

    @staticmethod
    def _product(vulnerabilities: list[dict]) -> str | None:
        names: list[str] = []
        for vulnerability in vulnerabilities:
            name = vulnerability.get('package', {}).get('name')
            if name and name not in names:
                names.append(name)
            if len(names) == 3:
                break
        return ', '.join(names) if names else None
