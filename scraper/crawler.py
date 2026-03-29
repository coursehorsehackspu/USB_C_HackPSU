# ============================================================
# DegreeFlow — crawler.py (OPTIMIZED)
# ============================================================

import logging
import time
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
    "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Connection": "keep-alive",
})


def _normalize(url: str) -> str:
    p = urlparse(url)
    clean = p._replace(fragment="", query="").geturl()
    return clean.rstrip("/").lower()


def _is_allowed(url: str) -> bool:
    domain = urlparse(url).netloc.replace("www.", "")
    return any(
        domain == d.replace("www.", "") or domain.endswith("." + d.replace("www.", ""))
        for d in config.ALLOWED_DOMAINS
    )


def _is_excluded(url: str) -> bool:
    return any(p in url.lower() for p in config.EXCLUDED_PATTERNS)


def _is_junk_title(title: str) -> bool:
    t = title.lower()
    return any(x in t for x in ["404", "page not found", "error", "access denied", "forbidden", "not found", "login", "sign in"])


class Crawler:
    def __init__(self, loader: MongoLoader):
        self.loader = loader
        self.visited: set[str] = set()
        self.queue: deque[tuple[str, int]] = deque()
        self.total_scraped = 0
        self.total_skipped = 0
        self.total_errors = 0

    def run(self):
        for seed in config.SEED_URLS:
            norm = _normalize(seed)
            if norm not in self.visited:
                self.visited.add(norm)
                self.queue.append((norm, 0))

        logger.info(f"🚀 Crawl started — {len(config.SEED_URLS)} seeds | depth={config.MAX_DEPTH}")

        while self.queue:
            if self.total_scraped >= config.MAX_PAGES:
                logger.info(f"🏁 Reached MAX_PAGES ({config.MAX_PAGES})")
                break
            url, depth = self.queue.popleft()
            self._process(url, depth)
            time.sleep(config.REQUEST_DELAY)

        logger.info(f"\n✅ Done — {self.total_scraped} scraped | {self.total_skipped} skipped | {self.total_errors} errors")
        logger.info(f"📊 {self.loader.get_stats()}")

    def _process(self, url: str, depth: int):
        if self.loader.already_scraped(url):
            self.total_skipped += 1
            return

        html = self._fetch(url)
        if not html:
            return

        try:
            doc = extract(url, html, depth)
        except Exception as e:
            logger.error(f"❌ Extract error {url}: {e}")
            self.total_errors += 1
            return

        # Skip 404s and junk
        if _is_junk_title(doc.get("title", "")):
            self.total_skipped += 1
            return

        # Skip empty pages
        if len(doc.get("text_content", "")) < 100:
            self.total_skipped += 1
            return

        action = self.loader.upsert(doc)
        self.total_scraped += 1
        logger.info(f"[{self.total_scraped}] {action.upper()} — {doc['title'][:60]} [{doc['section']}]")

        if depth < config.MAX_DEPTH:
            added = 0
            for link in doc.get("internal_links", []):
                if added >= config.MAX_LINKS_PER_PAGE:
                    break
                norm = _normalize(link)
                if norm not in self.visited and _is_allowed(norm) and not _is_excluded(norm):
                    self.visited.add(norm)
                    self.queue.append((norm, depth + 1))
                    added += 1

    def _fetch(self, url: str) -> str | None:
        try:
            resp = SESSION.get(url, timeout=config.REQUEST_TIMEOUT, allow_redirects=True)
            resp.raise_for_status()
            if "text/html" not in resp.headers.get("Content-Type", ""):
                return None
            return resp.text
        except requests.exceptions.HTTPError as e:
            if e.response.status_code not in (404, 403, 410):
                logger.warning(f"🔴 HTTP {e.response.status_code}: {url}")
        except requests.exceptions.Timeout:
            logger.warning(f"⏱️  Timeout: {url}")
        except requests.exceptions.RequestException:
            pass
        self.total_errors += 1
        return None