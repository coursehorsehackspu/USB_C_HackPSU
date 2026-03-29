# ============================================================
# CourseHorse Scraper — extractor.py
# ============================================================
# Extracts ALL meaningful content from a single HTML page:
# text, headings, emails, phones, videos, PDFs, links, etc.
# ============================================================

import re
from datetime import datetime, timezone
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup


# ── Regex patterns ────────────────────────────────────────
EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")
PHONE_RE = re.compile(
    r"(\+?1[\s\-.]?)?\(?\d{3}\)?[\s\-.]?\d{3}[\s\-.]?\d{4}"
)
YOUTUBE_RE = re.compile(
    r"(https?://)?(www\.)?(youtube\.com/watch\?v=|youtu\.be/)[\w\-]+"
)


def extract(url: str, html: str, depth: int) -> dict:
    """
    Given a URL and its raw HTML, return a structured document
    ready to insert into MongoDB.
    """
    soup = BeautifulSoup(html, "html.parser")

    # Remove script/style noise before text extraction
    for tag in soup(["script", "style", "noscript", "header", "footer", "nav"]):
        tag.decompose()

    return {
        "url": url,
        "domain": urlparse(url).netloc,
        "section": _infer_section(url),
        "title": _get_title(soup),
        "meta_description": _get_meta(soup, "description"),
        "meta_keywords": _get_meta(soup, "keywords"),
        "headings": _get_headings(soup),
        "text_content": _get_text(soup),
        "emails": _get_emails(soup, html),
        "phones": _get_phones(html),
        "videos": _get_videos(soup, url),
        "pdfs": _get_pdfs(soup, url),
        "images": _get_images(soup, url),
        "internal_links": _get_internal_links(soup, url),
        "external_links": _get_external_links(soup, url),
        "depth": depth,
        "scraped_at": datetime.now(timezone.utc).isoformat(),
        "status": "success",
    }


# ── Private helpers ───────────────────────────────────────

def _get_title(soup: BeautifulSoup) -> str:
    tag = soup.find("title")
    
    return tag.get_text(strip=True) if tag else ""


def _get_meta(soup: BeautifulSoup, name: str) -> str:
    tag = soup.find("meta", attrs={"name": name})
    if tag:
        return tag.get("content", "").strip()
    return ""


def _get_headings(soup: BeautifulSoup) -> list[str]:
    headings = []
    for level in ["h1", "h2", "h3", "h4"]:
        for tag in soup.find_all(level):
            text = tag.get_text(strip=True)
            if text:
                headings.append(text)
    return headings


def _get_text(soup: BeautifulSoup) -> str:
    """Clean, concatenated visible text from the page."""
    chunks = []
    for tag in soup.find_all(["p", "li", "td", "th", "blockquote", "span", "div"]):
        text = tag.get_text(separator=" ", strip=True)
        if len(text) > 40:  # skip tiny fragments
            chunks.append(text)
    full = " ".join(chunks)
    # Collapse whitespace
    full = re.sub(r"\s+", " ", full).strip()
    return full[:50000]  # cap at 50k chars per page


def _get_emails(soup: BeautifulSoup, raw_html: str) -> list[str]:
    found = set()
    # From mailto: links
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if href.startswith("mailto:"):
            email = href.replace("mailto:", "").split("?")[0].strip()
            if email:
                found.add(email.lower())
    # From raw HTML via regex
    for match in EMAIL_RE.findall(raw_html):
        if not match.endswith((".png", ".jpg", ".gif")):
            found.add(match.lower())
    return sorted(found)


def _get_phones(raw_html: str) -> list[str]:
    found = set()
    for match in PHONE_RE.findall(raw_html):
        digits = re.sub(r"\D", "", match)
        if len(digits) >= 10:
            found.add(match.strip())
    return sorted(found)


def _get_videos(soup: BeautifulSoup, base_url: str) -> list[dict]:
    videos = []
    seen = set()

    # <iframe> embeds (YouTube, Vimeo, Kaltura, etc.)
    for iframe in soup.find_all("iframe", src=True):
        src = iframe["src"]
        if any(x in src for x in ["youtube", "youtu.be", "vimeo", "kaltura", "mediasite"]):
            if src not in seen:
                seen.add(src)
                videos.append({"type": "embed", "url": src})

    # Explicit <video> tags
    for video in soup.find_all("video"):
        src = video.get("src") or ""
        if src and src not in seen:
            seen.add(src)
            videos.append({"type": "video_tag", "url": urljoin(base_url, src)})
        for source in video.find_all("source", src=True):
            s = source["src"]
            if s not in seen:
                seen.add(s)
                videos.append({"type": "video_source", "url": urljoin(base_url, s)})

    # YouTube links in <a> tags
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if YOUTUBE_RE.search(href) and href not in seen:
            seen.add(href)
            videos.append({"type": "youtube_link", "url": href})

    return videos


def _get_pdfs(soup: BeautifulSoup, base_url: str) -> list[str]:
    pdfs = []
    seen = set()
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if href.lower().endswith(".pdf"):
            full = urljoin(base_url, href)
            if full not in seen:
                seen.add(full)
                pdfs.append(full)
    return pdfs


def _get_images(soup: BeautifulSoup, base_url: str) -> list[dict]:
    images = []
    seen = set()
    for img in soup.find_all("img", src=True):
        src = urljoin(base_url, img["src"])
        if src not in seen:
            seen.add(src)
            images.append({
                "url": src,
                "alt": img.get("alt", "").strip(),
            })
    return images[:50]  # cap at 50 images per page


def _get_internal_links(soup: BeautifulSoup, base_url: str) -> list[str]:
    base_domain = urlparse(base_url).netloc.replace("www.", "")
    links = set()
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        full = urljoin(base_url, href)
        parsed = urlparse(full)
        page_domain = parsed.netloc.replace("www.", "")
        if base_domain in page_domain and parsed.scheme in ("http", "https"):
            # Normalize — remove fragment
            clean = parsed._replace(fragment="").geturl()
            links.add(clean)
    return sorted(links)


def _get_external_links(soup: BeautifulSoup, base_url: str) -> list[str]:
    base_domain = urlparse(base_url).netloc.replace("www.", "")
    links = set()
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        full = urljoin(base_url, href)
        parsed = urlparse(full)
        page_domain = parsed.netloc.replace("www.", "")
        if base_domain not in page_domain and parsed.scheme in ("http", "https"):
            links.add(full)
    return sorted(links)[:30]  # cap at 30 external links


def _infer_section(url: str) -> str:
    """Guess the site section from the URL path."""
    path = urlparse(url).path.lower()
    mappings = {
        "admissions": "Admissions",
        "financial": "Financial Aid",
        "tuition": "Financial Aid",
        "bulletin": "Course Catalog",
        "course": "Course Catalog",
        "registrar": "Registrar",
        "advising": "Academic Advising",
        "student": "Student Affairs",
        "research": "Research",
        "library": "Libraries",
        "career": "Career Services",
        "housing": "Housing",
        "health": "Health & Wellness",
        "athletics": "Athletics",
        "news": "News",
        "event": "Events",
        "faculty": "Faculty & Staff",
        "contact": "Contact",
        "about": "About PSU",
    }
    for key, label in mappings.items():
        if key in path:
            return label
    return "General"
