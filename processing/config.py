# ============================================================
# CourseHorse — config.py (OPTIMIZED)
# ============================================================

import os
from dotenv import load_dotenv
load_dotenv()

SEED_URLS = [
    "https://www.psu.edu",
    "https://www.psu.edu/academics",
    "https://www.psu.edu/campuses",
    "https://www.psu.edu/about",
    "https://bulletins.psu.edu/undergraduate/",
    "https://bulletins.psu.edu/graduate/",
    "https://admissions.psu.edu",
    "https://studentaffairs.psu.edu",
    "https://financialaid.psu.edu",
    "https://registrar.psu.edu",
    "https://gradschool.psu.edu",
    "https://global.psu.edu",
    "https://engineering.psu.edu",
    "https://science.psu.edu",
    "https://smeal.psu.edu",
    "https://education.psu.edu",
    "https://la.psu.edu",
    "https://ist.psu.edu",
    "https://nursing.psu.edu",
    "https://med.psu.edu",
    "https://dickinsonlaw.psu.edu",
    "https://news.psu.edu",
    "https://hr.psu.edu/careers",
    "https://housing.psu.edu",
    "https://diversity.psu.edu",
    "https://alumni.psu.edu",
    "https://bursar.psu.edu",
    "https://libraries.psu.edu",
    "https://sustainability.psu.edu",
    "https://careers.psu.edu",
]

ALLOWED_DOMAINS = [
    "psu.edu",
    "www.psu.edu",
    "bulletins.psu.edu",
    "admissions.psu.edu",
    "studentaffairs.psu.edu",
    "registrar.psu.edu",
    "financialaid.psu.edu",
    "gradschool.psu.edu",
    "global.psu.edu",
    "engineering.psu.edu",
    "science.psu.edu",
    "smeal.psu.edu",
    "education.psu.edu",
    "la.psu.edu",
    "ist.psu.edu",
    "nursing.psu.edu",
    "med.psu.edu",
    "dickinsonlaw.psu.edu",
    "news.psu.edu",
    "hr.psu.edu",
    "housing.psu.edu",
    "diversity.psu.edu",
    "alumni.psu.edu",
    "bursar.psu.edu",
    "libraries.psu.edu",
    "sustainability.psu.edu",
    "careers.psu.edu",
    "lionpathsupport.psu.edu",
    "liveon.psu.edu",
    "veterans.psu.edu",
    "senate.psu.edu",
    "research.psu.edu",
    "healthhumandev.psu.edu",
    "comm.psu.edu",
    "outreach.psu.edu",
    "continuing.psu.edu",
]

MAX_DEPTH = 6
MAX_PAGES = 999999       # No limit — crawl everything
MAX_LINKS_PER_PAGE = 40  # Cap links per page to stay efficient
REQUEST_DELAY = 1.0
REQUEST_TIMEOUT = 10
    
USER_AGENT = "DegreeFlow-Scraper/1.0 (Academic Research Bot; contact: yourname@email.com)"

MONGO_URI = os.getenv("MONGO_URI")
MONGO_DB = "degreeflow"
MONGO_COLLECTION = "psu_pages"

EXCLUDED_PATTERNS = [
    # Archives and old bulletins
    "/archive/", "2019-20", "2020-21", "2021-22", "2022-23", "2023-24",
    # File types
    ".jpg", ".jpeg", ".png", ".gif", ".svg", ".ico", ".pdf",
    ".css", ".js", ".woff", ".woff2", ".ttf", ".mp4", ".mp3",
    # Junk paths
    "/login", "/logout", "/wp-admin", "/feed", "/rss",
    "/print", "?print", "/ajax", "/json",
    "javascript:", "mailto:", "tel:", "#",
    # Repeated dynamic pages
    "?page=", "?p=", "?id=", "?ref=", "?utm_",
    ".cfm", "?popular=",
]

LOG_FILE = "scraper.log"