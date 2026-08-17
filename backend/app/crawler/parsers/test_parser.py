from html.parser import HTMLParser

from app.crawler.base import Parser


class _HTMLTitleAndParagraphExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self._in_title = False
        self._in_p = False
        self._title_parts: list[str] = []
        self._p_parts: list[str] = []

    def handle_starttag(self, tag, attrs):
        if tag.lower() == 'title':
            self._in_title = True
        if tag.lower() == 'p':
            self._in_p = True

    def handle_endtag(self, tag):
        if tag.lower() == 'title':
            self._in_title = False
        if tag.lower() == 'p':
            self._in_p = False

    def handle_data(self, data):
        if self._in_title:
            self._title_parts.append(data)
        if self._in_p and not self._in_title:
            self._p_parts.append(data)

    @property
    def title(self):
        return ' '.join(part.strip() for part in self._title_parts if part.strip())

    @property
    def paragraph(self):
        return ' '.join(part.strip() for part in self._p_parts if part.strip())


class TestParser(Parser):
    def parse(self, html: str, url: str) -> list[dict]:
        parser = _HTMLTitleAndParagraphExtractor()
        parser.feed(html)
        title = parser.title or 'Example advisory'
        summary = parser.paragraph or 'Example summary text for the fake advisory.'

        return [{
            'title': title,
            'organization': 'Example Org',
            'publication_date': '2026-08-18',
            'url': url,
            'source_domain': 'example.com',
            'cve': 'CVE-2026-0001',
            'product': 'Example Product',
            'severity': 'High',
            'summary': summary,
            'collection_date': '2026-08-18T00:00:00',
        }]
