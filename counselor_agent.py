# ============================================================
# CourseHorse — counselor_agent.py
# ============================================================
# AI Counselor Agent that searches both MongoDB databases
# and answers student questions using Claude AI.
# ============================================================

import os
import re
from dotenv import load_dotenv
from pymongo import MongoClient
import google.generativeai as genai


load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))


class xCounselorAgent:
    def __init__(self):
        self.client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=8000, tls=True, tlsAllowInvalidCertificates=True)
        self.general_db = self.client["degreeflow"]
        self.courses_db = self.client["degreeflow_courses"]
        self.model = genai.GenerativeModel("gemini-2.5-flash")
        
    def search_general(self, query: str, limit: int = 4) -> list[dict]:
        """Full-text search across general PSU pages."""
        try:
            results = self.general_db["psu_pages"].find(
                {"$text": {"$search": query}, "status": "success"},
                {"score": {"$meta": "textScore"}, "title": 1, "text_content": 1,
                 "url": 1, "section": 1, "emails": 1, "phones": 1},
            ).sort([("score", {"$meta": "textScore"})]).limit(limit)
            return list(results)
        except Exception:
            return []
    
    def search_courses(self, query: str, limit: int = 6) -> list[dict]:
        results = []

        # Direct course code match
        code_match = re.search(r"\b([A-Z]{2,6})\s*(\d{3}[A-Z]?)\b", query.upper())
        if code_match:
            code = f"{code_match.group(1)} {code_match.group(2)}"
            course = self.courses_db["courses"].find_one(
                {"course_code": code},
                {"course_code": 1, "title": 1, "credits": 1, "prerequisites": 1,
                "description": 1, "college": 1, "semesters_offered": 1, "bulletin_url": 1}
            )
            if course:
                results.append(course)
                return results  # ← return immediately, exact match is enough

        # Full-text search only if no code found
        try:
            text_results = self.courses_db["courses"].find(
                {"$text": {"$search": query}},
                {"score": {"$meta": "textScore"}, "course_code": 1, "title": 1,
                "credits": 1, "prerequisites": 1, "description": 1,
                "college": 1, "semesters_offered": 1, "bulletin_url": 1},
            ).sort([("score", {"$meta": "textScore"})]).limit(limit)
            results.extend(list(text_results))
        except Exception:
            pass

        return results[:limit]

    def search_programs(self, query: str, limit: int = 3) -> list[dict]:
        """Search degree programs."""
        try:
            return list(self.courses_db["programs"].find(
                {"program_name": {"$regex": query, "$options": "i"}},
                {"program_name": 1, "college": 1, "level": 1,
                 "required_courses": 1, "total_credits": 1}
            ).limit(limit))
        except Exception:
            return []

    def get_prerequisites(self, course_code: str) -> list[str]:
        """Get prerequisite chain for a course."""
        course = self.courses_db["courses"].find_one(
            {"course_code": course_code.upper()},
            {"prerequisites": 1}
        )
        return course.get("prerequisites", []) if course else []

    def ask(self, question: str, chat_history: list = None) -> dict:
        """
        Main method — takes a student question, searches both DBs,
        feeds context to Claude, returns answer + sources.
        """
        # Search both databases
        general_results = self.search_general(question)
        course_results = self.search_courses(question)
        program_results = self.search_programs(question)

        # Build context from search results
        context_parts = []

        if general_results:
            context_parts.append("=== PSU GENERAL INFORMATION ===")
            for r in general_results:
                snippet = r.get("text_content", "")[:800]
                emails = ", ".join(r.get("emails", []))
                phones = ", ".join(r.get("phones", []))
                context_parts.append(
                    f"Page: {r.get('title', '')}\n"
                    f"URL: {r.get('url', '')}\n"
                    f"Section: {r.get('section', '')}\n"
                    f"Content: {snippet}\n"
                    f"{'Contact: ' + emails if emails else ''}"
                    f"{'  Phone: ' + phones if phones else ''}"
                )

        if course_results:
            context_parts.append("\n=== COURSE INFORMATION ===")
            for c in course_results:
                prereqs = ", ".join(c.get("prerequisites", [])) or "None"
                semesters = ", ".join(c.get("semesters_offered", [])) or "Unknown"
                context_parts.append(
                    f"Course: {c.get('course_code')} - {c.get('title')}\n"
                    f"Credits: {c.get('credits')}\n"
                    f"Prerequisites: {prereqs}\n"
                    f"Offered: {semesters}\n"
                    f"College: {c.get('college')}\n"
                    f"Description: {c.get('description', '')[:400]}"
                )

        if program_results:
            context_parts.append("\n=== DEGREE PROGRAMS ===")
            for p in program_results:
                courses = ", ".join(p.get("required_courses", [])[:10])
                context_parts.append(
                    f"Program: {p.get('program_name')}\n"
                    f"College: {p.get('college')}\n"
                    f"Level: {p.get('level')}\n"
                    f"Credits Required: {p.get('total_credits')}\n"
                    f"Required Courses (sample): {courses}"
                )

        context = "\n\n".join(context_parts) if context_parts else "No specific information found in the database."

        # Build prompt with history
        history_text = ""
        if chat_history:
            for msg in chat_history[-6:]:
                role = "Student" if msg["role"] == "user" else "DegreeFlow"
                history_text += f"{role}: {msg['content']}\n"

        prompt = f"""You are CourseHorse, an AI academic counselor for Penn State University students.
                    You have access to PSU's course catalog, degree programs, policies, and general university information.

                    Answer the student's question using the context below. Be helpful, specific, and concise.
                    Always cite the source URL when referencing specific information.
                    If you don't find relevant information in the context, say so honestly.

                    CONTEXT FROM PSU DATABASE:
                    {context}

                    {f'CONVERSATION HISTORY:{chr(10)}{history_text}' if history_text else ''}
                    Student: {question}
                    DegreeFlow:
                """

        response = self.model.generate_content(prompt)
        answer = response.text

        # Collect source URLs
        sources = []
        for r in general_results:
            if r.get("url"):
                sources.append({"title": r.get("title", ""), "url": r["url"]})
        for c in course_results:
            if c.get("bulletin_url"):
                sources.append({"title": f"{c.get('course_code')} - {c.get('title')}", "url": c["bulletin_url"]})

        return {
            "answer": answer,
            "sources": sources,
            "courses_found": len(course_results),
            "pages_found": len(general_results),
        }

    def close(self):
        self.client.close()