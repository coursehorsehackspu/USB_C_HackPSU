# ============================================================
# DegreeFlow — course_config.py
# ============================================================

import os
from dotenv import load_dotenv
load_dotenv()

# MongoDB Atlas — same URI, different database
MONGO_URI = os.getenv("MONGO_URI")
MONGO_DB = "degreeflow_courses"

# Collections
COLLECTION_COURSES = "courses"
COLLECTION_PROGRAMS = "programs"
COLLECTION_PREREQUISITES = "prerequisites"

# Seed URLs — PSU bulletin covers all levels
SEED_URLS = [
    "https://bulletins.psu.edu/university-course-descriptions/undergraduate/",
    "https://bulletins.psu.edu/university-course-descriptions/graduate/",
    "https://bulletins.psu.edu/university-course-descriptions/medicine/",
    "https://bulletins.psu.edu/university-course-descriptions/law/",
]

# Only stay on bulletins
ALLOWED_DOMAINS = [
    "bulletins.psu.edu",
]

# Crawl settings
MAX_DEPTH = 6
REQUEST_DELAY = 1.2
REQUEST_TIMEOUT = 10

USER_AGENT = (
    "DegreeFlow-CourseScraper/1.0 (Academic Research Bot; "
    "contact: yourname@email.com)"
)

# URL patterns to skip
EXCLUDED_PATTERNS = [
    ".jpg", ".jpeg", ".png", ".gif", ".svg", ".ico",
    ".css", ".js", ".pdf", ".woff", ".woff2",
    "javascript:", "mailto:", "tel:", "#",
    "/search", "/print", "?print",
]

LOG_FILE = "course_scraper.log"
