# ============================================================
# DegreeFlow — course_scraper.py
# ============================================================
# Crawls bulletins.psu.edu specifically, extracts structured
# course data, and stores in degreeflow_courses on Atlas.
# ============================================================

import logging
import time
from collections import deque
from urllib.parse import urljoin, urlparse

import requests

import processing.course_config as config
from processing.course_extractor import extract_courses, extract_program, is_course_page
from database.course_loader import CourseLoader

logger = logging.getLogger("degreeflow_courses")

SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": config.USER_AGENT,
    "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
})


def _normalize(url: str) -> str:
    parsed = urlparse(url)
    return parsed._replace(fragment="").geturl().rstrip("/")


def _is_allowed(url: str) -> bool:
    domain = urlparse(url).netloc
    return any(domain == d or domain.endswith("." + d) for d in config.ALLOWED_DOMAINS)


def _is_excluded(url: str) -> bool:
    return any(p in url.lower() for p in config.EXCLUDED_PATTERNS)


def _get_internal_links(soup, base_url: str) -> list[str]:
    from bs4 import BeautifulSoup
    links = set()
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        full = urljoin(base_url, href)
        parsed = urlparse(full)
        if parsed.scheme in ("http", "https") and _is_allowed(full):
            clean = parsed._replace(fragment="").geturl()
            links.add(clean)
    return list(links)


class CourseScraper:
    def __init__(self, loader: CourseLoader):
        self.loader = loader
        self.visited: set[str] = set()
        self.queue: deque[tuple[str, int]] = deque()
        self.total_pages = 0
        self.total_courses = 0
        self.total_programs = 0
        self.total_errors = 0

    def run(self):
        # Seed all bulletin entry points
        for seed in config.SEED_URLS:
            norm = _normalize(seed)
            if norm not in self.visited:
                self.visited.add(norm)
                self.queue.append((norm, 0))

        logger.info(f"🎓 Course crawl started — {len(config.SEED_URLS)} seed URLs")
        logger.info(f"   Max depth: {config.MAX_DEPTH}")

        while self.queue:
            url, depth = self.queue.popleft()
            self._process(url, depth)
            time.sleep(config.REQUEST_DELAY)

        # Build prerequisite graph after all courses loaded
        logger.info("\n🔗 Building prerequisite dependency graph...")
        self.loader.build_prerequisite_graph()

        logger.info(f"\n✅ Course crawl complete!")
        logger.info(f"   Pages visited:   {self.total_pages}")
        logger.info(f"   Courses stored:  {self.total_courses}")
        logger.info(f"   Programs stored: {self.total_programs}")
        logger.info(f"   Errors:          {self.total_errors}")

        stats = self.loader.get_stats()
        logger.info(f"\n📊 Atlas stats: {stats}")

    def _process(self, url: str, depth: int):
        logger.info(f"[{self.total_pages + 1}] depth={depth} → {url}")

        html = self._fetch(url)
        if not html:
            return

        self.total_pages += 1

        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "html.parser")

        # Extract courses from this page
        if is_course_page(url, soup):
            courses = extract_courses(url, html)
            if courses:
                result = self.loader.bulk_upsert_courses(courses)
                self.total_courses += result["inserted"] + result["updated"]
                logger.info(
                    f"   🎓 {len(courses)} courses — "
                    f"{result['inserted']} new, {result['updated']} updated"
                )

        # Extract program requirements
        program = extract_program(url, html)
        if program:
            action = self.loader.upsert_program(program)
            self.total_programs += 1
            logger.info(f"   📋 Program {action}: {program['program_name'][:50]}")

        # Enqueue new links
        if depth < config.MAX_DEPTH:
            added = 0
            for link in _get_internal_links(soup, url):
                norm = _normalize(link)
                if (
                    norm not in self.visited
                    and not _is_excluded(norm)
                    and added < 50
                ):
                    self.visited.add(norm)
                    self.queue.append((norm, depth + 1))
                    added += 1

    def _fetch(self, url: str) -> str | None:
        try:
            resp = SESSION.get(url, timeout=config.REQUEST_TIMEOUT, allow_redirects=True)
            resp.raise_for_status()
            ct = resp.headers.get("Content-Type", "")
            if "text/html" not in ct:
                return None
            return resp.text
        except requests.exceptions.HTTPError as e:
            logger.warning(f"🔴 HTTP {e.response.status_code}: {url}")
        except requests.exceptions.Timeout:
            logger.warning(f"⏱️  Timeout: {url}")
        except requests.exceptions.RequestException as e:
            logger.warning(f"⚠️  Error {url}: {e}")
        self.total_errors += 1
        return None
