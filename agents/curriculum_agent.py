import json
from typing import List, Dict
from models.schema import Course, StudentProfile, AgentResponse

class CurriculumAgent:
    def __init__(self):
        with open('data/courses.json', 'r') as f:
            self.courses = {c['code']: Course(**c) for c in json.load(f)}
        
        with open('data/requirements.json', 'r') as f:
            self.requirements = json.load(f)
    
    def analyze(self, profile: StudentProfile) -> AgentResponse:
        """Determine which courses student should take based on major requirements"""
        
        major_reqs = self.requirements.get(profile.major, {})
        required_courses = major_reqs.get('required_courses', [])
        prerequisites = major_reqs.get('prerequisites', {})
        
        # Find courses student still needs to take
        remaining_required = [
            code for code in required_courses 
            if code not in profile.completed_courses
        ]
        
        # Check which courses have prerequisites satisfied
        eligible_courses = []
        for course_code in remaining_required:
            prereqs = prerequisites.get(course_code, [])
            if all(p in profile.completed_courses for p in prereqs):
                eligible_courses.append(course_code)
        
        # Add must-take courses
        if profile.must_take_courses:
            for course in profile.must_take_courses:
                if course not in eligible_courses and course in self.courses:
                    eligible_courses.append(course)
        
        reasoning = (
            f"Analyzed {profile.major} major requirements. "
            f"Student has completed {len(profile.completed_courses)} courses. "
            f"Found {len(eligible_courses)} courses with satisfied prerequisites."
        )
        
        return AgentResponse(
            agent_name="Curriculum Agent",
            output={
                "eligible_courses": eligible_courses,
                "remaining_required": remaining_required,
                "courses_data": {code: self.courses[code].dict() for code in eligible_courses if code in self.courses}
            },
            reasoning=reasoning
        )