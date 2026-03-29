import re
from datetime import datetime, timezone
from urllib.parse import urlparse
from bs4 import BeautifulSoup

# Improved regex to handle non-breaking spaces (\xa0) and different dash types
COURSE_CODE_RE = re.compile(r"\b([A-Z]{2,6})(?:\s|&nbsp;|\xa0)(\d{3}[A-Z]?)\b")
CREDITS_RE = re.compile(r"(\d+(?:\.\d+)?)\s*(?:credits?|unit)", re.IGNORECASE)
SEMESTER_RE = re.compile(r"\b(Fall|Spring|Summer|Winter)\b", re.IGNORECASE)

def extract_courses(url: str, html: str) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    # First try the standard courseblocks (PSU 2025-26 style)
    courses = _extract_from_courseblocks(url, soup)
    
    # Fallback for older DT/DD style pages if needed
    if not courses:
        dts = soup.find_all("dt")
        for dt in dts:
            try:
                title_text = dt.get_text(separator=" ", strip=True).replace('\xa0', ' ')
                code_match = COURSE_CODE_RE.search(title_text)
                if not code_match: continue

                subject, number = code_match.groups()
                course_code = f"{subject} {number}"
                full_title = title_text[code_match.end():].strip(" :-–")
                
                dd = dt.find_next_sibling("dd")
                description = dd.get_text(separator=" ", strip=True) if dd else ""
                
                # We extract from the whole text to avoid missing anything
                combined_text = title_text + " " + description
                
                courses.append({
                    "course_code": course_code,
                    "subject": subject,
                    "number": number,
                    "title": full_title, # REMOVED SLICE
                    "credits": _extract_credits(combined_text),
                    "description": description, # REMOVED SLICE
                    "prerequisites": _extract_prerequisites(combined_text),
                    "prerequisites_raw": _extract_prereq_raw(combined_text),
                    "semesters_offered": _extract_semesters(combined_text),
                    "department": _infer_department(subject),
                    "college": _infer_college_from_subject(subject),
                    "level": _infer_level(url),
                    "bulletin_url": url,
                    "scraped_at": datetime.now(timezone.utc).isoformat(),
                    "status": "success",
                })
            except Exception: continue
            
    return courses

def _extract_from_courseblocks(url: str, soup: BeautifulSoup) -> list[dict]:
    courses = []
    blocks = soup.find_all("div", class_=lambda c: c and "courseblock" in c)
    for block in blocks:
        try:
            # Get Title
            title_tag = block.find(class_=lambda c: c and "courseblocktitle" in c)
            if not title_tag: continue
            title_text = title_tag.get_text(separator=" ", strip=True).replace('\xa0', ' ')
            
            code_match = COURSE_CODE_RE.search(title_text)
            if not code_match: continue
            
            subject, number = code_match.groups()
            course_code = f"{subject} {number}"
            full_title = title_text[code_match.end():].strip(" :-–")
            full_title = re.sub(r"\([\d\s\-credits]+\)", "", full_title, flags=re.IGNORECASE).strip()

            # Get Description
            desc_tag = block.find(class_=lambda c: c and "courseblockdesc" in c)
            description = desc_tag.get_text(separator=" ", strip=True) if desc_tag else ""

            # NEW: Get "Extra" info (Prereqs, Recommended Prep, etc.)
            extra_tags = block.find_all(class_=lambda c: c and "courseblockextra" in c)
            extra_text = " ".join([e.get_text(separator=" ", strip=True) for e in extra_tags]).replace('\xa0', ' ')

            # Search across BOTH description and extras to be safe
            context_text = description + " " + extra_text

            courses.append({
                "course_code": course_code,
                "subject": subject,
                "number": number,
                "title": full_title, # NO SLICE
                "credits": _extract_credits(title_text + " " + context_text),
                "description": description, # NO SLICE
                "prerequisites": _extract_prerequisites(context_text),
                "prerequisites_raw": _extract_prereq_raw(context_text), # Now looks at extra_text too
                "semesters_offered": _extract_semesters(context_text),
                "department": _infer_department(subject),
                "college": _infer_college_from_subject(subject),
                "level": _infer_level(url),
                "bulletin_url": url,
                "scraped_at": datetime.now(timezone.utc).isoformat(),
                "status": "success",
            })
        except Exception: continue
    return courses

def _extract_credits(text: str) -> float | None:
    match = CREDITS_RE.search(text)
    if match:
        try: return float(match.group(1))
        except ValueError: return None
    return None

def _extract_prerequisites(text: str) -> list[str]:
    # Look for the word prerequisite and capture until the end of the string
    # We use a wider window to ensure we don't cut off long lists
    prereq_match = re.search(r"(?:prerequisite|prereq|requisite|preparation|concurrent)[s]?\s*:?\s*(.*)", text, re.IGNORECASE | re.DOTALL)
    if not prereq_match: return []
    
    section = prereq_match.group(1)
    codes = COURSE_CODE_RE.findall(section)
    return sorted(list(set(f"{s} {n}" for s, n in codes)))

def _extract_prereq_raw(text: str) -> str:
    # Greedily capture the sentence containing prerequisite info
    match = re.search(r"([^.]*(?:prerequisite|prereq|requisite|preparation|concurrent)[^.]*)", text, re.IGNORECASE)
    return match.group(1).strip() if match else ""

def _extract_semesters(text: str) -> list[str]:
    return sorted(set(m.group(1).capitalize() for m in SEMESTER_RE.finditer(text)))

def _infer_level(url: str) -> str:
    path = url.lower()
    if "graduate" in path: return "Graduate"
    if "law" in path or "dickinsonlaw" in path: return "Law"
    if "medicine" in path: return "Medicine"
    return "Undergraduate"

def _infer_college_from_subject(subject: str) -> str:
    mapping = {
       "CMPSC": "College of Engineering", "CMPEN": "College of Engineering",
        "EE": "College of Engineering", "ME": "College of Engineering",
        "CE": "College of Engineering", "CHE": "College of Engineering",
        "MATH": "Eberly College of Science", "PHYS": "Eberly College of Science",
        "CHEM": "Eberly College of Science", "BIOL": "Eberly College of Science",
        "STAT": "Eberly College of Science", "ACCTG": "Smeal College of Business",
        "FIN": "Smeal College of Business", "MKTG": "Smeal College of Business",
        "MGMT": "Smeal College of Business", "ECON": "College of the Liberal Arts",
        "PSYCH": "College of the Liberal Arts", "SOC": "College of the Liberal Arts",
        "ENGL": "College of the Liberal Arts", "HIST": "College of the Liberal Arts",
        "POLS": "College of the Liberal Arts",
        "IST": "College of Information Sciences and Technology",
        "COMM": "Donald P. Bellisario College of Communications",
        "NURS": "Ross and Carol Nese College of Nursing",
    }
    return mapping.get(subject, "Penn State")

def _infer_department(subject: str) -> str:
    mapping = {
       "CMPSC": "Computer Science", "CMPEN": "Computer Engineering",
        "EE": "Electrical Engineering", "MATH": "Mathematics",
        "PHYS": "Physics", "CHEM": "Chemistry", "BIOL": "Biology",
        "STAT": "Statistics", "ACCTG": "Accounting", "FIN": "Finance",
        "MKTG": "Marketing", "MGMT": "Management", "ECON": "Economics",
        "PSYCH": "Psychology", "SOC": "Sociology", "ENGL": "English",
        "HIST": "History", "POLS": "Political Science",
        "IST": "Information Sciences and Technology",
        "COMM": "Communications", "ME": "Mechanical Engineering",
        "CE": "Civil Engineering", "CHE": "Chemical Engineering",
        "NURS": "Nursing", "ARCH": "Architecture",
    }
    return mapping.get(subject, subject)
