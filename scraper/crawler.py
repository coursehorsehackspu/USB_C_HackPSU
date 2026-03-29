# ============================================================
# CourseHorse Scraper — crawler.py
# ============================================================
# Recursive crawler that surfs PSU's entire website,
# discovers internal links, and feeds pages to extractor.py
# ============================================================

import logging
import time
import urllib.robotparser
from collections import deque
from urllib.parse import urljoin, urlparse

import requests

import processing.config as config
from processing.extractor import extract
from database.mongo_loader import MongoLoader

logger = logging.getLogger("degreeflow")

SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": config.USER_AGENT,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
})


# ── Robots.txt parser ─────────────────────────────────────

_robots_cache: dict[str, urllib.robotparser.RobotFileParser] = {}

def _can_fetch(url: str) -> bool:
    """Check robots.txt for this domain."""
    parsed = urlparse(url)
    base = f"{parsed.scheme}://{parsed.netloc}"
    if base not in _robots_cache:
        rp = urllib.robotparser.RobotFileParser()
        rp.set_url(f"{base}/robots.txt")
        try:
            rp.read()
        except Exception:
            pass  # If robots.txt fails to load, allow crawling
        _robots_cache[base] = rp
    return _robots_cache[base].can_fetch(config.USER_AGENT, url)


# ── URL filters ───────────────────────────────────────────

def _is_allowed_domain(url: str) -> bool:
    domain = urlparse(url).netloc.replace("www.", "")
    return any(domain == d.replace("www.", "") or domain.endswith("." + d.replace("www.", ""))
               for d in config.ALLOWED_DOMAINS)


def _is_excluded(url: str) -> bool:
    url_lower = url.lower()
    return any(pattern in url_lower for pattern in config.EXCLUDED_PATTERNS)


def _normalize(url: str) -> str:
    """Remove fragment, trailing slashes for dedup."""
    parsed = urlparse(url)
    clean = parsed._replace(fragment="").geturl()
    return clean.rstrip("/")


# ── Main crawler ──────────────────────────────────────────

class Crawler:
    def __init__(self, loader: MongoLoader):
        self.loader = loader
        self.visited: set[str] = set()
        self.queue: deque[tuple[str, int]] = deque()  # (url, depth)
        self.total_scraped = 0
        self.total_errors = 0

    def run(self):
        for seed in config.SEED_URLS:
            norm = _normalize(seed)
            self.queue.append((norm, 0))
            self.visited.add(norm)

        logger.info(f"🚀 Crawl started — seed: {seed}")
        logger.info(f"   Max depth: {config.MAX_DEPTH} | Max pages: {config.MAX_PAGES}")

        while self.queue:
            if self.total_scraped >= config.MAX_PAGES:
                logger.info(f"🏁 Reached MAX_PAGES limit ({config.MAX_PAGES}). Stopping.")
                break

            url, depth = self.queue.popleft()
            self._process(url, depth)

            # Polite delay
            time.sleep(config.REQUEST_DELAY)

        logger.info(
            f"\n✅ Crawl complete — {self.total_scraped} pages scraped, "
            f"{self.total_errors} errors."
        )
        stats = self.loader.get_stats()
        logger.info(f"📊 MongoDB stats: {stats}")

    def _process(self, url: str, depth: int):
        # Skip if already in DB
        if self.loader.already_scraped(url):
            logger.debug(f"⏭️  Already scraped: {url}")
            return

        logger.info(f"[{self.total_scraped + 1}] depth={depth} → {url}")

        # Fetch the page
        html = self._fetch(url)
        if html is None:
            return

        # Extract everything
        try:
            doc = extract(url, html, depth)
        except Exception as e:
            logger.error(f"❌ Extract error {url}: {e}")
            self.loader.save_error(url, str(e))
            self.total_errors += 1
            return
        
        # Skip 404 pages
        if "404" in doc.get("title", "") or "page not found" in doc.get("title", "").lower():
            self.loader.save_error(url, "404_not_found")
            return

        # Save to MongoDB
        action = self.loader.upsert(doc)
        self.total_scraped += 1
        logger.info(f"   💾 {action.upper()} — {doc['title'][:60]} [{doc['section']}]")

        # Enqueue new links if we haven't hit max depth
        if depth < config.MAX_DEPTH:
            added = 0
            for link in doc.get("internal_links", []):
                if added >= 30:  # cap links per page
                    break
                norm = _normalize(link)
                if (
                    norm not in self.visited
                    and _is_allowed_domain(norm)
                    and not _is_excluded(norm)
                ):
                    self.visited.add(norm)
                    self.queue.append((norm, depth + 1))
                    added += 1

    def _fetch(self, url: str) -> str | None:
        """Fetch a URL and return its HTML, or None on failure."""
        try:
            resp = SESSION.get(url, timeout=config.REQUEST_TIMEOUT, allow_redirects=True)
            resp.raise_for_status()

            # Only process HTML pages
            ct = resp.headers.get("Content-Type", "")
            if "text/html" not in ct:
                logger.debug(f"⏭️  Skipping non-HTML: {url} ({ct})")
                return None

            return resp.text

        except requests.exceptions.TooManyRedirects:
            logger.warning(f"🔁 Too many redirects: {url}")
        except requests.exceptions.Timeout:
            logger.warning(f"⏱️  Timeout: {url}")
        except requests.exceptions.HTTPError as e:
            logger.warning(f"🔴 HTTP {e.response.status_code}: {url}")
        except requests.exceptions.RequestException as e:
            logger.warning(f"⚠️  Request error {url}: {e}")

        self.loader.save_error(url, "fetch_failed")
        self.total_errors += 1
        return None
