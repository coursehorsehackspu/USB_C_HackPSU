#!/usr/bin/env python3
# parse_bulletin_pdf.py
# Parses the undergraduate bulletin PDF and extracts all degree programs
# with their required courses into degreeflow_courses.programs

import re
import logging
from datetime import datetime, timezone
import pdfplumber
from database.course_loader import CourseLoader

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("pdf_parser")

COURSE_CODE_RE = re.compile(r"\b([A-Z]{2,6})\s(\d{3}[A-Z]?)\b")
CREDITS_RE = re.compile(r"(\d{2,3})\s*(?:total\s+)?credits?", re.IGNORECASE)

# Patterns that indicate a new program/major section
PROGRAM_HEADER_RE = re.compile(
    r"^(.+?),\s*(B\.[A-Z\.]+|Bachelor of [A-Za-z ]+)\s*$",
    re.MULTILINE
)

REQUIRED_KEYWORDS = ["required course", "major requirement", "core requirement", "prescribed course", "required:"]
ELECTIVE_KEYWORDS = ["elective", "supporting course", "general education", "free elective", "related course"]


def extract_programs_from_pdf(pdf_path: str) -> list[dict]:
    programs = []
    current_program = None
    current_text_lines = []
    in_required = False
    in_elective = False

    logger.info(f"📖 Opening PDF: {pdf_path}")

    with pdfplumber.open(pdf_path) as pdf:
        total_pages = len(pdf.pages)
        logger.info(f"   Total pages: {total_pages}")

        for page_num, page in enumerate(pdf.pages):
            if page_num % 50 == 0:
                logger.info(f"   Processing page {page_num}/{total_pages}...")

            text = page.extract_text() or ""
            lines = text.split("\n")

            for line in lines:
                line = line.strip()
                if not line:
                    continue

                # Detect new program header
                header_match = PROGRAM_HEADER_RE.match(line)
                if header_match:
                    # Save previous program
                    if current_program and current_program["required_courses"]:
                        programs.append(current_program)

                    program_name = f"{header_match.group(1).strip()}, {header_match.group(2).strip()}"
                    current_program = {
                        "program_name": program_name,
                        "url": "",
                        "college": "Penn State",
                        "level": "Undergraduate",
                        "required_courses": [],
                        "optional_courses": [],
                        "total_credits": None,
                        "scraped_at": datetime.now(timezone.utc).isoformat(),
                    }
                    in_required = False
                    in_elective = False
                    current_text_lines = []
                    continue

                if current_program is None:
                    continue

                current_text_lines.append(line)
                line_lower = line.lower()

                # Detect section type
                if any(x in line_lower for x in REQUIRED_KEYWORDS):
                    in_required = True
                    in_elective = False
                elif any(x in line_lower for x in ELECTIVE_KEYWORDS):
                    in_elective = True
                    in_required = False

                # Extract credits total
                if current_program["total_credits"] is None:
                    credit_match = CREDITS_RE.search(line)
                    if credit_match:
                        val = int(credit_match.group(1))
                        if 60 <= val <= 200:
                            current_program["total_credits"] = val

                # Extract course codes
                for s, n in COURSE_CODE_RE.findall(line):
                    code = f"{s} {n}"
                    if in_required and not in_elective:
                        if code not in current_program["required_courses"]:
                            current_program["required_courses"].append(code)
                    else:
                        if code not in current_program["optional_courses"] and code not in current_program["required_courses"]:
                            current_program["optional_courses"].append(code)

        # Save last program
        if current_program and current_program["required_courses"]:
            programs.append(current_program)

    logger.info(f"✅ Extracted {len(programs)} programs from PDF")
    return programs


def main():
    loader = CourseLoader()
    loader.connect()
    loader.programs.drop()
    loader._setup_indexes()
    logger.info("🗑️  Cleared existing programs")

    programs = extract_programs_from_pdf("undergraduate_bulletin.pdf")

    stored = 0
    for prog in programs:
        if prog["required_courses"]:
            loader.upsert_program(prog)
            stored += 1
            logger.info(f"   ✅ {prog['program_name']} — {len(prog['required_courses'])} required | {prog['total_credits']} credits")

    logger.info(f"\n✅ Done! {stored} programs stored in degreeflow_courses.programs")
    stats = loader.get_stats()
    logger.info(f"📊 {stats}")
    loader.close()


if __name__ == "__main__":
    main()