import json
from typing import List
from models.schema import Section, StudentProfile, AgentResponse

class PolicyAgent:
    def __init__(self):
        with open('data/sections.json', 'r') as f:
            self.all_sections = [Section(**s) for s in json.load(f)]
        
        with open('data/requirements.json', 'r') as f:
            self.requirements = json.load(f)
    
    def check_policies(self, profile: StudentProfile, eligible_courses: List[str]) -> AgentResponse:
        """Filter courses based on university policies"""
        
        major_reqs = self.requirements.get(profile.major, {})
        min_credits = major_reqs.get('min_credits_per_semester', 12)
        max_credits = major_reqs.get('max_credits_per_semester', 18)
        
        # Get available sections for eligible courses
        available_sections = [
            s for s in self.all_sections
            if s.course_code in eligible_courses 
            and s.semester == "Fall" 
            and s.year == 2026
            and s.is_open
            and s.enrolled_count < s.total_seats
        ]
        
        # Group by course
        sections_by_course = {}
        for section in available_sections:
            if section.course_code not in sections_by_course:
                sections_by_course[section.course_code] = []
            sections_by_course[section.course_code].append(section)
        
        reasoning = (
            f"Applied university policies. Credit range: {min_credits}-{max_credits}. "
            f"Found {len(available_sections)} open sections across {len(sections_by_course)} courses. "
            f"Filtered out full sections and unavailable courses."
        )
        
        return AgentResponse(
            agent_name="Policy Agent",
            output={
                "available_sections": [s.dict() for s in available_sections],
                "sections_by_course": {k: [s.dict() for s in v] for k, v in sections_by_course.items()},
                "credit_limits": {"min": min_credits, "max": max_credits}
            },
            reasoning=reasoning
        )