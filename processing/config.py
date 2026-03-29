# ============================================================
# CourseHorse Scraper — config.py
# ============================================================
from dotenv import load_dotenv
import os
load_dotenv()

# All PSU subdomains to stay within
ALLOWED_DOMAINS = [
    "psu.edu",
    "www.psu.edu",
    "bulletins.psu.edu",
    "admissions.psu.edu",
    "studentaffairs.psu.edu",
    "registrar.psu.edu",
    "financialaid.psu.edu",
    "libraries.psu.edu",
    "advising.psu.edu",
    "engineering.psu.edu",
    "science.psu.edu",
    "smeal.psu.edu",
    "la.psu.edu",
    "lps.psu.edu",
]

# How many links deep to crawl from the seed (increase carefully)
MAX_DEPTH = 4

# Max pages to scrape total (safety cap — remove for full crawl)
MAX_PAGES = 999999

# Seconds to wait between requests (be polite!)
REQUEST_DELAY = 1.0

# Request timeout in seconds
REQUEST_TIMEOUT = 8

# User-Agent header (identify yourself honestly)
USER_AGENT = (
    "DegreeFlow-Scraper/1.0 (Academic Research Bot; "
    "contact: yourname@email.com)"
)

# MongoDB settings
MONGO_URI = os.getenv("MONGO_URI")
MONGO_DB = "degreeflow"
MONGO_COLLECTION = "psu_pages"
# Seed URL — where the crawler starts
SEED_URLS = [
    "https://www.psu.edu",
    "https://www.psu.edu/academics",
    "https://www.psu.edu/campuses",
    "https://www.psu.edu/about",
    "https://www.psu.edu/research",
    "https://bulletins.psu.edu/undergraduate/",
    "https://bulletins.psu.edu/graduate/",
    "https://admissions.psu.edu",
    "https://studentaffairs.psu.edu",
    "https://financialaid.psu.edu",
    "https://registrar.psu.edu",
    "https://libraries.psu.edu",
    "https://hr.psu.edu",
    "https://research.psu.edu",
    "https://gradschool.psu.edu",
    "https://global.psu.edu",
    "https://engineering.psu.edu",
    "https://science.psu.edu",
    "https://smeal.psu.edu",
    "https://education.psu.edu",
    "https://la.psu.edu",
    "https://healthhumandev.psu.edu",
    "https://ist.psu.edu",
    "https://comm.psu.edu",
    "https://nursing.psu.edu",
    "https://med.psu.edu",
    "https://dickinsonlaw.psu.edu",
    "https://news.psu.edu",
    "https://events.psu.edu",
    "https://careers.psu.edu",
    "https://housing.psu.edu",
    "https://studentaid.psu.edu",
    "https://diversity.psu.edu",
    "https://sustainability.psu.edu",
    "https://alumni.psu.edu",
]

# URL patterns to SKIP (not useful content)
EXCLUDED_PATTERNS = [
    "/login", "/logout", "/wp-admin", "/feed", "/rss",
    ".jpg", ".jpeg", ".png", ".gif", ".svg", ".ico",
    ".css", ".js", ".woff", ".woff2", ".ttf",
    "javascript:", "mailto:", "tel:", "#","2019-20.cfm", 
    "2020-21.cfm", "2021-22.cfm", "2022-23.cfm",
    "2023-24.cfm", "2024-25.cfm", ".cfm", 
]

# Log file path
LOG_FILE = "scraper.log"
