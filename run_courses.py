# ============================================================
# DegreeFlow — run_courses.py
# ============================================================
# Entry point for the course scraper. Run this in Terminal 2
# while the general scraper runs in Terminal 1.
#
# Usage:
#   python run_courses.py            ← full course crawl
#   python run_courses.py --stats    ← show DB stats & exit
#   python run_courses.py --reset    ← drop & re-scrape
#   python run_courses.py --graph    ← rebuild prereq graph only
# ============================================================

import argparse
import logging
import sys

from database.course_loader import CourseLoader
from scraper.scrape_courses_selenium import scrape_page


def setup_logging():
    import processing.course_config as config
    fmt = "%(asctime)s [%(levelname)s] %(message)s"
    logging.basicConfig(
        level=logging.INFO,
        format=fmt,
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler(config.LOG_FILE, encoding="utf-8"),
        ],
    )


def parse_args():
    parser = argparse.ArgumentParser(description="DegreeFlow Course Scraper")
    parser.add_argument("--stats", action="store_true", help="Show stats and exit")
    parser.add_argument("--reset", action="store_true", help="Drop collections and re-scrape")
    parser.add_argument("--graph", action="store_true", help="Rebuild prerequisite graph only")
    return parser.parse_args()


def main():
    setup_logging()
    logger = logging.getLogger("degreeflow_courses")
    args = parse_args()

    loader = CourseLoader()
    loader.connect()

    if args.stats:
        stats = loader.get_stats()
        print("\n📊 DegreeFlow Course Database Stats")
        print(f"   Total courses:  {stats['total_courses']}")
        print(f"   Programs:       {stats['programs']}")
        print(f"   Prereq nodes:   {stats['prereq_nodes']}")
        print("\n   By college:")
        for college, count in stats["by_college"].items():
            print(f"     {college:<45} {count}")
        print("\n   By level:")
        for level, count in stats["by_level"].items():
            print(f"     {level:<20} {count}")
        loader.close()
        return

    if args.reset:
        loader.courses.drop()
        loader.programs.drop()
        loader.prerequisites.drop()
        loader._setup_indexes()
        logger.info("🗑️  Course collections dropped. Starting fresh.")

    if args.graph:
        loader.build_prerequisite_graph()
        loader.close()
        return

    try:
        # IMPORT THE SCRAPER LOGIC HERE
        from scraper.scrape_courses_selenium import init_driver, scrape_page, DEPARTMENT_URLS
        import time

        driver = init_driver()
        total_saved = 0

        for url in DEPARTMENT_URLS:
            logger.info(f"📄 Scraping: {url}")
            courses = scrape_page(driver, url)
            if courses:
                result = loader.bulk_upsert_courses(courses)
                count = result["inserted"] + result["updated"]
                total_saved += count
                logger.info(f"   ✅ {len(courses)} courses processed")
            time.sleep(1.5)
            
    except KeyboardInterrupt:
        logger.info("\n⛔ Course crawl interrupted.")
    except Exception as e:
        logger.error(f"💥 Fatal error during scrape: {e}")
    finally:
        driver.quit() # Crucial: Close the browser
        loader.build_prerequisite_graph()
        loader.close()


if __name__ == "__main__":
    main()
