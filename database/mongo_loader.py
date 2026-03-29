# ============================================================
# CourseHorse Scraper — mongo_loader.py
# ============================================================
# Handles all MongoDB interactions:
#   - Connect, insert, upsert, stats
# ============================================================

import logging
from datetime import datetime, timezone

from pymongo import MongoClient, UpdateOne
from pymongo.errors import BulkWriteError, ConnectionFailure

import processing.config as config

logger = logging.getLogger("degreeflow")


class MongoLoader:
    def __init__(self):
        self.client = None
        self.db = None
        self.collection = None

    def connect(self):
        """Connect to MongoDB and set up indexes."""
        try:
            self.client = MongoClient(
                config.MONGO_URI,
                serverSelectionTimeoutMS=5000,
            )
            # Ping to confirm connection
            self.client.admin.command("ping")
            self.db = self.client[config.MONGO_DB]
            self.collection = self.db[config.MONGO_COLLECTION]
            self._setup_indexes()
            logger.info(
                f"✅ Connected to MongoDB: {config.MONGO_DB}.{config.MONGO_COLLECTION}"
            )
        except ConnectionFailure as e:
            logger.error(f"❌ MongoDB connection failed: {e}")
            raise

    def _setup_indexes(self):
        """Create indexes for fast querying."""
        self.collection.create_index("url", unique=True)
        self.collection.create_index("domain")
        self.collection.create_index("section")
        self.collection.create_index("scraped_at")
        # Text index for full-text search (powers AI Counselor later)
        self.collection.create_index(
            [("title", "text"), ("text_content", "text"), ("headings", "text")],
            name="full_text_search",
            weights={"title": 10, "headings": 5, "text_content": 1},
        )
        logger.info("📑 MongoDB indexes ready")

    def upsert(self, doc: dict) -> str:
        """
        Insert or update a page document by URL.
        Returns 'inserted' or 'updated'.
        """
        result = self.collection.update_one(
            {"url": doc["url"]},
            {"$set": doc},
            upsert=True,
        )
        return "inserted" if result.upserted_id else "updated"

    def bulk_upsert(self, docs: list[dict]) -> dict:
        """Bulk upsert a list of documents. Returns counts."""
        if not docs:
            return {"inserted": 0, "updated": 0}
        ops = [
            UpdateOne({"url": d["url"]}, {"$set": d}, upsert=True)
            for d in docs
        ]
        try:
            result = self.collection.bulk_write(ops, ordered=False)
            return {
                "inserted": result.upserted_count,
                "updated": result.modified_count,
            }
        except BulkWriteError as e:
            logger.warning(f"Bulk write partial error: {e.details}")
            return {"inserted": 0, "updated": 0}

    def save_error(self, url: str, error: str):
        """Log a failed URL into MongoDB for retry later."""
        self.collection.update_one(
            {"url": url},
            {
                "$set": {
                    "url": url,
                    "status": "error",
                    "error_message": error,
                    "scraped_at": datetime.now(timezone.utc).isoformat(),
                }
            },
            upsert=True,
        )

    def already_scraped(self, url: str) -> bool:
        """Check if URL has already been successfully scraped."""
        doc = self.collection.find_one(
            {"url": url, "status": "success"},
            {"_id": 1},
        )
        return doc is not None

    def get_stats(self) -> dict:
        """Return summary stats about the current collection."""
        total = self.collection.count_documents({})
        success = self.collection.count_documents({"status": "success"})
        errors = self.collection.count_documents({"status": "error"})

        # Section breakdown
        pipeline = [
            {"$match": {"status": "success"}},
            {"$group": {"_id": "$section", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
        ]
        sections = {
            r["_id"]: r["count"]
            for r in self.collection.aggregate(pipeline)
        }

        return {
            "total_pages": total,
            "successful": success,
            "errors": errors,
            "sections": sections,
        }

    def close(self):
        if self.client:
            self.client.close()
            logger.info("MongoDB connection closed.")
