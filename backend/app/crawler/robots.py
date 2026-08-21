from urllib import robotparser
from urllib.parse import urljoin


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

    base = base_url.rstrip("/")
    robots_url = urljoin(base + "/", "robots.txt")
    parser = robotparser.RobotFileParser()

    try:
        parser.set_url(robots_url)
        parser.read()
        return parser.can_fetch(user_agent, path)
    except Exception:
        return False
