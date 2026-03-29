# ============================================================
# CourseHorse — scrape_courses_selenium.py
# Usage: python scraper/scrape_courses_selenium.py
# ============================================================

import re
import time
import logging
from datetime import datetime, timezone

from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

from processing.course_extractor import _extract_credits, _extract_semesters
from database.course_loader import CourseLoader

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("degreeflow_selenium")

COURSE_CODE_RE = re.compile(r"\b([A-Z]{2,6})\s(\d{3}[A-Z]?)\b")

# ============================================================
# URL DEFINITIONS
# ============================================================
BASE_UG = "https://bulletins.psu.edu/university-course-descriptions/undergraduate/"
BASE_GR = "https://bulletins.psu.edu/university-course-descriptions/graduate/"
BASE_LAW_D = "https://bulletins.psu.edu/university-course-descriptions/dickinsonlaw"
BASE_LAW_P = "https://bulletins.psu.edu/university-course-descriptions/pennstatelaw"
BASE_MED = "https://bulletins.psu.edu/university-course-descriptions/medicine"

UG_DEPTS = [
    "acctg","acs","adted","aersp","afam","afr","agbm","absm","aee","agcom",
    "agsc","ag","ageco","agro","air","amst","ansc","anth","aba","aplng",
    "ayfce","arab","ae","aet","arch","army","art","aed","arth","a-i",
    "aie","aima","artsa","aa","aas","asia","astro","athtr","besc","bbh",
    "bmb","bioet","bmh","be","bisc","biol","bme","be_t","brs","biotc",
    "ba","blaw","che","chem","cmas","chns","civcm","ce","cet","cams",
    "cas","csd","comm","cedev","ced","cied","cmlit","cmpmt","cmpeh","cmpen",
    "cmpet","cmpsc","cc","cned","crimj","crim","ci","c-s","cyber","dance",
    "da","ds","dart","digit","dmd","ece","emsc","earth","econ","educ",
    "edmth","edldr","edpsy","edtec","edthp","ee","eet","emet","eledm",
    "egee","eme","ebf","ennec","engr","edsgn","egt","emch","esc","et",
    "engl","esl","eti","ent","entr","enve","erm","envsc","envst","envse",
    "fin","cap","fdsc","fdsys","frnar","frnsc","fort","for","fr","fsc",
    "game","geog","geosc","ger","glis","gd","greek","hhd","hlhed","hhum",
    "hpa","hebr","hied","hindi","hist","hls","honor","hort","hm","hdfs",
    "hrm","hcdd","hum","hss","ie","iet","insc","ist","itech","iec",
    "insys","inart","isb","intag","ib","intst","intsp","it","japns","jst",
    "kines","kor","ler","lhr","larch","lled","lang","latin","latam","ltnst",
    "lpe","ldt","la","lst","ling","mgmt","mis","mktg","maet","matse",
    "math","mthed","me","met","medvl","meteo","micrb","mnpr","mng","mngt",
    "music","brass","jazz","keybd","percn","strng","voice","wwnds","navsc",
    "nuce","nurs","nutr","os","ot","olead","png","phil","photo","pt",
    "phys","plant","ppem","plet","pol","plsc","pes","port","psu","psych",
    "pubh","php","pubpl","ppol","qmm","qc","reths","radsc","rte","rptm",
    "rhs","rlst","rm","rsoc","rus","sset","spsy","sc","scied","sts",
    "sra","slav","soda","ssed","socw","soc","sweng","soils","span","spled",
    "stat","scm","sur","sust","swa","edab","thea","turf","ukr","vbsc",
    "wildl","wfs","wgss","wmnst","wp","wfed","wled"
]

GR_DEPTS = [
    "acctg","aersp","afam","ageco","agro","agsc","ansc","anth","aplng",
    "arch","arth","astro","bbh","biol","bme","che","chem",
    "ci","cned","cmpsc","comm","econ","edpsy","edthp","ee",
    "egee","eme","emch","engl","enve","fdsc","fin","for","geog","geosc",
    "hdfs","hied","hist","hpa","ie","insys","ist","kines","larch","ling",
    "matse","math","me","meteo","mgmt","nuce","nurs","nutr",
    "phys","plsc","rlst","rptm","rsoc","scied",
    "soc","soils","span","stat","thea","vbsc","wfed","wgss","wfs"
]

DEPARTMENT_URLS = (
    [BASE_UG + d for d in UG_DEPTS] +
    [BASE_GR + d for d in GR_DEPTS] +
    [BASE_LAW_D, BASE_LAW_P, BASE_MED]
)
# ============================================================


def init_driver():
    options = webdriver.ChromeOptions()
    options.add_argument("--headless=new") 
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    
    # ANTI-BOT MEASURES
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option('useAutomationExtension', False)
    options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
    
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
    
    # Hide webdriver property
    driver.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument", {
        "source": "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
    })
    return driver


def scrape_page(driver, url: str) -> list[dict]:
    courses = []
    try:
        driver.get(url)
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "div.courseblock"))
        )
    except Exception:
        logger.warning(f"⚠️ No courses found at {url}")
        return []

    soup = BeautifulSoup(driver.page_source, "html.parser")
    blocks = soup.find_all("div", class_="courseblock")
    
    for block in blocks:
        try:
            # 1. Title Parsing
            title_el = block.find("div", class_="course_codetitle")
            if not title_el: continue
                
            title_text = title_el.get_text(strip=True)
            code_match = COURSE_CODE_RE.search(title_text)
            if not code_match: continue
                
            subject, number = code_match.groups()
            course_code = f"{subject} {number}"
            full_title = title_text.split(":", 1)[-1].strip()

            # 2. Credits
            credits_el = block.find("div", class_="course_credits")
            credits = _extract_credits(credits_el.get_text(strip=True)) if credits_el else None

            # 3. Description (REMOVED CHAR LIMIT)
            desc_el = block.find("div", class_="courseblockdesc")
            description = desc_el.get_text(separator=" ", strip=True) if desc_el else ""

            # 4. Prerequisites (GREEDY EXTRACTION)
            prereq_raw_list = []
            prerequisites = []
            
            # We look for all 'courseblockextra' because PSU splits prereqs, 
            # concurrent courses, and prep into different divs sometimes.
            extras = block.find_all("div", class_="courseblockextra")
            for extra in extras:
                text = extra.get_text(separator=" ", strip=True).replace('\xa0', ' ')
                
                # Keywords that indicate we care about this "extra" block
                if any(word in text for word in ["Prerequisite", "Preparation", "Concurrent"]):
                    prereq_raw_list.append(text)
                    # Find ALL course codes in this block
                    codes = COURSE_CODE_RE.findall(text)
                    for s, n in codes:
                        prerequisites.append(f"{s} {n}")

            # Join all raw prereq strings into one full string (REMOVED CHAR LIMIT)
            full_prereq_raw = " | ".join(prereq_raw_list)
            # Remove duplicates from the code list
            pr_list = sorted(list(set(prerequisites)))

            courses.append({
                "course_code": course_code,
                "subject": subject,
                "number": number,
                "title": full_title,
                "credits": credits,
                "description": description, # Full text saved
                "prerequisites": pr_list,
                "prerequisites_raw": full_prereq_raw, # Full text saved
                "semesters_offered": _extract_semesters(description + " " + full_prereq_raw),
                "department": subject,
                "college": "Penn State",
                "level": _infer_level(url),
                "bulletin_url": url, # Full URL saved
                "scraped_at": datetime.now(timezone.utc).isoformat(),
                "status": "success",
            })
            
        except Exception as e:
            logger.error(f"Error parsing block: {e}")
            continue

    return courses

def _infer_level(url: str) -> str:
    path = url.lower()
    if "/undergraduate/" in path: return "Undergraduate"
    if "/graduate/" in path: return "Graduate"
    if "law" in path: return "Law"
    if "medicine" in path: return "Medicine"
    return "Undergraduate"

def main():
    logger.info("🚀 Starting Bulletproof Selenium/BS4 course scraper")
    loader = CourseLoader()
    loader.connect()

    driver = init_driver()
    total = 0

    try:
        for url in DEPARTMENT_URLS:
            logger.info(f"📄 Scraping: {url}")
            courses = scrape_page(driver, url)
            if courses:
                result = loader.bulk_upsert_courses(courses)
                total += result["inserted"] + result["updated"]
                logger.info(f"   ✅ {len(courses)} courses — {result['inserted']} new, {result['updated']} updated")
            
            time.sleep(1.5)
            
    finally:
        driver.quit()
        
    loader.build_prerequisite_graph()
    logger.info(f"\n✅ Done! {total} courses stored.")
    stats = loader.get_stats()
    logger.info(f"📊 {stats}")
    loader.close()

if __name__ == "__main__":
    main()