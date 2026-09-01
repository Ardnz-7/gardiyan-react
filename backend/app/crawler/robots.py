from urllib import robotparser
from urllib.parse import urlparse

import httpx


KNOWN_PUBLIC_DATA_FEEDS = {
    # CISA publishes this JSON feed for public automated consumption; its robots.txt returns 403 due to CDN/bot protection blocking the robots.txt fetch itself, not an actual crawl restriction on this data feed.
    "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json",
}


def is_known_public_feed(url: str) -> bool:
    return url in KNOWN_PUBLIC_DATA_FEEDS


def check_robots_allowed(base_url: str, path: str, user_agent: str = "GardiyanBot") -> bool:
    """Return True when the given path is allowed according to robots.txt."""
    if not base_url or not path:
        return True

    parsed = urlparse(base_url)
    robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"
    parser = robotparser.RobotFileParser()

    try:
        # robotparser.read() fetches robots.txt itself via urllib with a generic default
        # User-Agent, which some CDNs (NVD, Red Hat) reject with a 403 that robotparser then
        # interprets as "disallow everything" — a false block, not a real robots.txt rule. So
        # we fetch it ourselves with a real User-Agent and hand robotparser the text directly.
        response = httpx.get(robots_url, headers={'User-Agent': user_agent}, timeout=10)
        if response.status_code == 404:
            return True
        if response.status_code >= 400:
            return False
        parser.parse(response.text.splitlines())
        return parser.can_fetch(user_agent, path)
    except Exception:
        return False
