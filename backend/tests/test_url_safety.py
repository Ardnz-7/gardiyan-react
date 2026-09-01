import pytest

from app.crawler.url_safety import validate_url_is_safe


def test_rejects_non_http_scheme():
    for url in ('ftp://example.com', 'file:///etc/passwd'):
        is_safe, reason = validate_url_is_safe(url)
        assert is_safe is False
        assert 'scheme' in reason.lower()


def test_rejects_localhost():
    is_safe, reason = validate_url_is_safe('http://localhost')
    assert is_safe is False


def test_rejects_loopback_ip():
    is_safe, reason = validate_url_is_safe('http://127.0.0.1')
    assert is_safe is False


def test_rejects_ipv6_loopback():
    is_safe, reason = validate_url_is_safe('http://[::1]')
    assert is_safe is False


@pytest.mark.parametrize('url', ['http://10.0.0.1', 'http://172.16.0.1', 'http://192.168.1.1'])
def test_rejects_private_ipv4_ranges(url):
    is_safe, reason = validate_url_is_safe(url)
    assert is_safe is False


def test_rejects_link_local_metadata_ip():
    is_safe, reason = validate_url_is_safe('http://169.254.169.254')
    assert is_safe is False
    assert '169.254.169.254' in reason


@pytest.mark.parametrize('url', ['http://', 'not-a-url'])
def test_rejects_url_with_no_hostname(url):
    is_safe, reason = validate_url_is_safe(url)
    assert is_safe is False


def test_accepts_public_https_url():
    is_safe, reason = validate_url_is_safe('https://example.com')
    assert is_safe is True
    assert reason is None


def test_rejects_unresolvable_hostname():
    is_safe, reason = validate_url_is_safe('http://this-domain-should-never-exist-12345.invalid')
    assert is_safe is False
    assert 'resolved' in reason.lower()
