# ============================================================
# CourseHorse — course_loader.py
# ============================================================
# Handles all MongoDB writes for the course database.
# Separate from mongo_loader.py — writes to degreeflow_courses
# ============================================================

import logging
from pymongo import MongoClient, UpdateOne
from pymongo.errors import ConnectionFailure, BulkWriteError

import processing.course_config as config

logger = logging.getLogger("degreeflow_courses")


class CourseLoader:
    def __init__(self):
        self.client = None
        self.db = None
        self.courses = None
        self.programs = None
        self.prerequisites = None

    def connect(self):
        try:
            self.client = MongoClient(config.MONGO_URI, serverSelectionTimeoutMS=8000)
            self.client.admin.command("ping")
            self.db = self.client[config.MONGO_DB]
            self.courses = self.db[config.COLLECTION_COURSES]
            self.programs = self.db[config.COLLECTION_PROGRAMS]
            self.prerequisites = self.db[config.COLLECTION_PREREQUISITES]
            self._setup_indexes()
            logger.info(f"✅ Connected to Atlas: {config.MONGO_DB}")
        except ConnectionFailure as e:
            logger.error(f"❌ MongoDB connection failed: {e}")
            raise

    def _setup_indexes(self):
        # Courses collection
        self.courses.create_index("course_code", unique=True)
        self.courses.create_index("subject")
        self.courses.create_index("college")
        self.courses.create_index("level")
        self.courses.create_index("prerequisites")
        self.courses.create_index("majors")
        self.courses.create_index([
            ("course_code", "text"),
            ("title", "text"),
            ("description", "text"),
        ], name="course_text_search",
           weights={"course_code": 10, "title": 5, "description": 1})

        # Programs collection
        self.programs.create_index("program_name", unique=True)
        self.programs.create_index("college")
        self.programs.create_index("level")

        # Prerequisites collection (dependency graph)
        self.prerequisites.create_index("course_code", unique=True)
        self.prerequisites.create_index("prerequisites")

        logger.info("📑 Course indexes ready")

    def upsert_course(self, course: dict) -> str:
        result = self.courses.update_one(
            {"course_code": course["course_code"]},
            {"$set": course},
            upsert=True,
        )
        return "inserted" if result.upserted_id else "updated"

    def bulk_upsert_courses(self, courses: list[dict]) -> dict:
        if not courses:
            return {"inserted": 0, "updated": 0}
        ops = [
            UpdateOne(
                {"course_code": c["course_code"]},
                {"$set": c},
                upsert=True
            )
            for c in courses
        ]
        try:
            result = self.courses.bulk_write(ops, ordered=False)
            return {
                "inserted": result.upserted_count,
                "updated": result.modified_count,
            }
        except BulkWriteError as e:
            logger.warning(f"Bulk write error: {e.details}")
            return {"inserted": 0, "updated": 0}

    def upsert_program(self, program: dict) -> str:
        result = self.programs.update_one(
            {"program_name": program["program_name"]},
            {"$set": program},
            upsert=True,
        )
        return "inserted" if result.upserted_id else "updated"

    def build_prerequisite_graph(self):
        """
        After all courses are loaded, build the prerequisite
        dependency graph collection for the scheduler.
        """
        logger.info("🔗 Building prerequisite dependency graph...")
        ops = []
        for course in self.courses.find({}, {"course_code": 1, "prerequisites": 1}):
            ops.append(UpdateOne(
                {"course_code": course["course_code"]},
                {"$set": {
                    "course_code": course["course_code"],
                    "prerequisites": course.get("prerequisites", []),
                    "prereq_count": len(course.get("prerequisites", [])),
                }},
                upsert=True,
            ))
        if ops:
            self.prerequisites.bulk_write(ops, ordered=False)
            logger.info(f"✅ Prerequisite graph built: {len(ops)} nodes")

    def already_scraped(self, url: str) -> bool:
        return self.courses.find_one({"bulletin_url": url}) is not None

    def get_stats(self) -> dict:
        total = self.courses.count_documents({})
        pipeline = [
            {"$group": {"_id": "$college", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
        ]
        by_college = {r["_id"]: r["count"] for r in self.courses.aggregate(pipeline)}

        level_pipeline = [
            {"$group": {"_id": "$level", "count": {"$sum": 1}}},
        ]
        by_level = {r["_id"]: r["count"] for r in self.courses.aggregate(level_pipeline)}

        return {
            "total_courses": total,
            "programs": self.programs.count_documents({}),
            "prereq_nodes": self.prerequisites.count_documents({}),
            "by_college": by_college,
            "by_level": by_level,
        }

    def close(self):
        if self.client:
            self.client.close()
