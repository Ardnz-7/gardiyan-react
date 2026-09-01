import json
from datetime import date, timedelta
from pathlib import Path

from app.crawler.parsers.cisa_kev_parser import CISAKEVParser
from app.crawler.parsers.nvd_parser import NVDParser

FIXTURES_DIR = Path(__file__).parent / 'fixtures'


def _load_fixture(name: str) -> str:
    return (FIXTURES_DIR / name).read_text(encoding='utf-8')


def test_nvd_parser_extracts_records():
    html = _load_fixture('nvd_sample.json')
    records = NVDParser().parse(html, 'https://services.nvd.nist.gov/rest/json/cves/2.0')

    assert len(records) == 3

    first = records[0]
    assert first['title'] == 'CVE-2026-12345'
    assert first['cve'] == 'CVE-2026-12345'
    assert first['severity'] == 'Critical'
    assert first['summary'] == (
        'A buffer overflow vulnerability in ExampleApp allows remote attackers to execute arbitrary code.'
    )
    assert first['publication_date'] == '2026-08-15'
    assert first['url'] == 'https://example.com/advisories/CVE-2026-12345'


def test_nvd_parser_skips_malformed_entries():
    data = json.loads(_load_fixture('nvd_sample.json'))
    del data['vulnerabilities'][0]['cve']['id']

    records = NVDParser().parse(json.dumps(data), 'https://services.nvd.nist.gov/rest/json/cves/2.0')

    assert len(records) == 2
    assert {record['cve'] for record in records} == {'CVE-2026-67890', 'CVE-2026-11111'}


def test_cisa_kev_parser_extracts_records():
    html = _load_fixture('cisa_kev_sample.json')
    records = CISAKEVParser().parse(html, 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog')

    assert len(records) == 3

    first = records[0]
    assert first['title'] == 'ExampleSoft SecureGateway Authentication Bypass Vulnerability'
    assert first['cve'] == 'CVE-2026-22222'
    assert first['url'] == (
        'https://www.cisa.gov/known-exploited-vulnerabilities-catalog?field_cve=CVE-2026-22222'
    )
    assert first['product'] == 'ExampleSoft SecureGateway'


def test_cisa_kev_parser_limits_to_20_most_recent():
    start = date(2026, 1, 1)
    vulnerabilities = [
        {
            'cveID': f'CVE-2026-9{index:03d}',
            'vendorProject': 'FakeVendor',
            'product': 'FakeProduct',
            'vulnerabilityName': f'Fake Vulnerability {index}',
            'dateAdded': (start + timedelta(days=index)).isoformat(),
            'shortDescription': f'Description {index}',
        }
        for index in range(25)
    ]
    data = {'vulnerabilities': vulnerabilities}

    records = CISAKEVParser().parse(
        json.dumps(data), 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog'
    )

    assert len(records) == 20
    # newest-first: index 24 (2026-01-25) down to index 5 (2026-01-06), indices 0-4 cut off
    assert records[0]['cve'] == 'CVE-2026-9024'
    assert records[-1]['cve'] == 'CVE-2026-9005'
    dates = [record['publication_date'] for record in records]
    assert dates == sorted(dates, reverse=True)
