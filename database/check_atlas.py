# ============================================================
# CourseHorse — check_atlas.py
# ============================================================
# Run this to verify your MongoDB Atlas connection is working
# before launching the full crawl.
#
# Usage:
#   python database/check_atlas.py
# ============================================================

import os
import sys
from datetime import datetime, timezone

from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ConfigurationError, OperationFailure

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")

def check():
    print("\n🔍 CourseHorse — MongoDB Atlas Connection Checker")
    print("=" * 50)

    # ── Step 1: Check .env loaded ─────────────────────────
    if not MONGO_URI:
        print("❌ MONGO_URI not found in .env file!")
        print("   Make sure your .env file exists and contains:")
        print("   MONGO_URI=mongodb+srv://youruser:yourpass@cluster0.xxx.mongodb.net/")
        sys.exit(1)

    masked = MONGO_URI[:30] + "..." + MONGO_URI[-20:]
    print(f"\n✅ Step 1 — .env loaded")
    print(f"   URI: {masked}")

    # ── Step 2: Connect ───────────────────────────────────
    print(f"\n⏳ Step 2 — Connecting to Atlas...")
    try:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=8000)
        client.admin.command("ping")
        print(f"✅ Step 2 — Connected to Atlas successfully!")
    except ConfigurationError as e:
        print(f"❌ Configuration error: {e}")
        print("   Check your URI format — it should start with mongodb+srv://")
        sys.exit(1)
    except ConnectionFailure as e:
        print(f"❌ Connection failed: {e}")
        print("   Check your password and that Atlas allows your IP address.")
        print("   Atlas → Network Access → Add IP → Allow from anywhere (0.0.0.0/0)")
        sys.exit(1)
    except OperationFailure as e:
        print(f"❌ Authentication failed: {e}")
        print("   Your username or password is incorrect.")
        print("   Atlas → Database Access → Edit → Edit Password")
        sys.exit(1)

    # ── Step 3: Check server info ─────────────────────────
    server_info = client.server_info()
    print(f"\n✅ Step 3 — Server info")
    print(f"   MongoDB version: {server_info.get('version', 'unknown')}")

    # ── Step 4: Write test document ───────────────────────
    print(f"\n⏳ Step 4 — Testing read/write...")
    try:
        db = client["degreeflow"]
        col = db["connection_test"]
        test_doc = {
            "test": True,
            "message": "DegreeFlow Atlas connection successful!",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        result = col.insert_one(test_doc)
        print(f"✅ Step 4 — Write successful! Doc ID: {result.inserted_id}")

        # Clean up test doc
        col.delete_one({"_id": result.inserted_id})
        print(f"   🧹 Test document cleaned up")
    except Exception as e:
        print(f"❌ Read/write test failed: {e}")
        sys.exit(1)

    # ── Step 5: Check existing PSU data ───────────────────
    print(f"\n✅ Step 5 — Checking existing DegreeFlow data...")
    try:
        psu = db["psu_pages"]
        total = psu.count_documents({})
        if total == 0:
            print(f"   📭 No PSU pages yet — ready for your first crawl!")
            print(f"   Run: python run.py --depth 6")
        else:
            success = psu.count_documents({"status": "success"})
            errors = psu.count_documents({"status": "error"})
            print(f"   📄 Total pages in Atlas: {total}")
            print(f"   ✅ Successful: {success}")
            print(f"   ❌ Errors: {errors}")

            # Section breakdown
            pipeline = [
                {"$match": {"status": "success"}},
                {"$group": {"_id": "$section", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}},
                {"$limit": 8},
            ]
            sections = list(psu.aggregate(pipeline))
            if sections:
                print(f"\n   Top sections:")
                for s in sections:
                    print(f"     {s['_id']:<30} {s['count']} pages")
    except Exception as e:
        print(f"❌ Stats check failed: {e}")

    # ── All good ──────────────────────────────────────────
    print(f"\n{'=' * 50}")
    print(f"🎉 Atlas is connected and ready for DegreeFlow!")
    print(f"   Next step: python run.py --depth 6")
    print(f"{'=' * 50}\n")
    client.close()

if __name__ == "__main__":
    check()