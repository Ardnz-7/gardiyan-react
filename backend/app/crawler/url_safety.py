"""SSRF protection: validate that a source-configured URL does not point at localhost,
private/reserved IP ranges, link-local addresses, or cloud metadata endpoints before it's
used to make an outbound request.

This covers hostname/IP-based SSRF at validation time, but NOT DNS-rebinding attacks (where
a hostname resolves to a safe IP at check-time but a different, unsafe IP at request-time).
Full protection against that would require pinning the resolved IP and connecting to it
directly (e.g. via a custom transport), which is out of scope for now.
"""

import ipaddress
import socket
from urllib.parse import urlparse

ALLOWED_SCHEMES = {'http', 'https'}


def _is_unsafe_ip(ip_str: str) -> bool:
    ip = ipaddress.ip_address(ip_str)
    return (
        ip.is_loopback
        or ip.is_private
        or ip.is_link_local
        or ip.is_reserved
        or ip.is_multicast
    )


def validate_url_is_safe(url: str) -> tuple[bool, str | None]:
    """Return (True, None) if url is safe to fetch, or (False, reason) if not."""
    parsed = urlparse(url)

    if parsed.scheme not in ALLOWED_SCHEMES:
        return False, f'Unsupported URL scheme: {parsed.scheme!r} (only http/https are allowed)'

    hostname = parsed.hostname
    if not hostname:
        return False, 'URL has no hostname'

    try:
        addr_infos = socket.getaddrinfo(hostname, None)
    except socket.gaierror as exc:
        # Fail closed: an unresolvable hostname is treated as unsafe rather than silently allowed.
        return False, f'Hostname could not be resolved: {exc}'

    resolved_ips = {addr_info[4][0] for addr_info in addr_infos}

    for ip_str in resolved_ips:
        if _is_unsafe_ip(ip_str):
            return False, f'Hostname resolves to a disallowed IP address: {ip_str}'

    return True, None
