# ============================================================
# DegreeFlow Scraper — run.py
# ============================================================
# Entry point. Run this to start the full crawl:
#   python run.py
#
# Optional flags:
#   python run.py --stats       → show DB stats and exit
#   python run.py --reset       → drop collection and re-crawl
#   python run.py --depth 2     → override MAX_DEPTH
#   python run.py --max 500     → override MAX_PAGES
# ============================================================

import argparse
import logging
import sys

import processing.config as config
from scraper.crawler import Crawler
from database.mongo_loader import MongoLoader


def setup_logging():
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
    parser = argparse.ArgumentParser(description="DegreeFlow PSU Scraper")
    parser.add_argument("--stats", action="store_true", help="Show DB stats and exit")
    parser.add_argument("--reset", action="store_true", help="Drop collection before crawl")
    parser.add_argument("--depth", type=int, help="Override MAX_DEPTH")
    parser.add_argument("--max", type=int, help="Override MAX_PAGES")
    return parser.parse_args()


def main():
    setup_logging()
    logger = logging.getLogger("degreeflow")
    args = parse_args()

    # Apply CLI overrides
    if args.depth:
        config.MAX_DEPTH = args.depth
        logger.info(f"⚙️  MAX_DEPTH overridden to {config.MAX_DEPTH}")
    if args.max:
        config.MAX_PAGES = args.max
        logger.info(f"⚙️  MAX_PAGES overridden to {config.MAX_PAGES}")

    # Connect to MongoDB
    loader = MongoLoader()
    loader.connect()

    # --stats: just print and exit
    if args.stats:
        stats = loader.get_stats()
        print("\n📊 DegreeFlow MongoDB Stats")
        print(f"   Total pages:  {stats['total_pages']}")
        print(f"   Successful:   {stats['successful']}")
        print(f"   Errors:       {stats['errors']}")
        print("\n   Sections:")
        for section, count in stats["sections"].items():
            print(f"     {section:<30} {count}")
        loader.close()
        return

    # --reset: drop collection
    if args.reset:
        loader.collection.drop()
        logger.info("🗑️  Collection dropped. Starting fresh.")

    # Run the crawler
    try:
        crawler = Crawler(loader)
        crawler.run()
    except KeyboardInterrupt:
        logger.info("\n⛔ Crawl interrupted by user.")
    finally:
        loader.close()


if __name__ == "__main__":
    main()
