from urllib import robotparser
from urllib.parse import urljoin


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
        return True
