from typing import List, Dict
from itertools import combinations
from models.schema import Section, StudentProfile, ScheduleOption
import json

class OptimizationAgent:
    def __init__(self):
        with open('data/courses.json', 'r') as f:
            self.courses = {c['code']: c for c in json.load(f)}
    
    def generate_schedules(self, profile: StudentProfile, sections_by_course: Dict, credit_limits: Dict) -> List[ScheduleOption]:
        """Generate optimized schedule options"""
        
        schedules = []
        
        # Get one section per course for simple combinations
        course_codes = list(sections_by_course.keys())
        
        # Try different combinations of courses
        for num_courses in range(len(course_codes), 2, -1):  # Try from max courses down
            for course_combo in combinations(course_codes, num_courses):
                # Get one section from each course
                for section_combo in self._get_section_combinations(course_combo, sections_by_course):
                    sections = [Section(**s) for s in section_combo]
                    
                    # Check if valid
                    if not self._has_time_conflicts(sections):
                        total_credits = sum(self.courses[s.course_code]['credits'] for s in sections)
                        
                        if credit_limits['min'] <= total_credits <= profile.max_credits:
                            score = self._calculate_score(sections, profile)
                            
                            schedules.append(ScheduleOption(
                                sections=sections,
                                total_credits=total_credits,
                                score=score,
                                reasoning=self._generate_reasoning(sections, score)
                            ))
            
            if schedules:
                break  # Found valid schedules
        
        # Sort by score and return top 3
        schedules.sort(key=lambda x: x.score, reverse=True)
        return schedules[:3]
    
    def _get_section_combinations(self, course_codes, sections_by_course):
        """Get all combinations of sections for given courses"""
        if not course_codes:
            yield []
            return
        
        first_course = course_codes[0]
        rest_courses = course_codes[1:]
        
        for section in sections_by_course[first_course]:
            for rest_combo in self._get_section_combinations(rest_courses, sections_by_course):
                yield [section] + rest_combo
    
    def _has_time_conflicts(self, sections: List[Section]) -> bool:
        """Check if any sections have time conflicts"""
        for i, s1 in enumerate(sections):
            for s2 in sections[i+1:]:
                if self._sections_overlap(s1, s2):
                    return True
        return False
    
    def _sections_overlap(self, s1: Section, s2: Section) -> bool:
        """Check if two sections overlap in time"""
        # Check if they meet on same days
        days1 = set(s1.meeting_days)
        days2 = set(s2.meeting_days)
        
        if not days1.intersection(days2):
            return False  # No common meeting days
        
        # Check time overlap
        start1 = self._time_to_minutes(s1.start_time)
        end1 = self._time_to_minutes(s1.end_time)
        start2 = self._time_to_minutes(s2.start_time)
        end2 = self._time_to_minutes(s2.end_time)
        
        return not (end1 <= start2 or end2 <= start1)
    
    def _time_to_minutes(self, time_str: str) -> int:
        """Convert HH:MM to minutes since midnight"""
        hours, minutes = map(int, time_str.split(':'))
        return hours * 60 + minutes
    
    def _calculate_score(self, sections: List[Section], profile: StudentProfile) -> float:
        """Calculate preference match score (0-100)"""
        score = 100.0
        
        # Penalize early classes
        for section in sections:
            start_hour = int(section.start_time.split(':')[0])
            if start_hour < 9:
                score -= 10
            elif start_hour < 10:
                score -= 5
        
        # Bonus for highly rated instructors
        for section in sections:
            if section.instructor_rating and section.instructor_rating >= 4.5:
                score += 5
        
        # Workload balance
        total_workload = sum(
            self.courses[s.course_code]['avg_workload_hours'] 
            for s in sections
        )
        
        if profile.workload_preference == "light" and total_workload > 30:
            score -= 10
        elif profile.workload_preference == "heavy" and total_workload < 35:
            score -= 5
        
        return min(100.0, max(0.0, score))
    
    def _generate_reasoning(self, sections: List[Section], score: float) -> dict:
        """Generate explanations for this schedule"""
        return {
            "score": score,
            "num_courses": len(sections),
            "earliest_class": min(s.start_time for s in sections),
            "latest_class": max(s.end_time for s in sections)
        }