from typing import Dict
from models.schema import StudentProfile, ScheduleOption
from agents.curriculum_agent import CurriculumAgent
from agents.policy_agent import PolicyAgent
from agents.preference_agent import PreferenceAgent
from agents.optimization_agent import OptimizationAgent
from agents.conflict_agent import ConflictAgent

class Orchestrator:
    def __init__(self):
        self.curriculum_agent = CurriculumAgent()
        self.policy_agent = PolicyAgent()
        self.preference_agent = PreferenceAgent()
        self.optimization_agent = OptimizationAgent()
        self.conflict_agent = ConflictAgent()
    
    def generate_schedules(self, profile: StudentProfile) -> Dict:
        """Coordinate all agents to generate optimized schedules"""
        
        agent_logs = []
        
        # Step 1: Curriculum Agent
        print("🎓 Running Curriculum Agent...")
        curriculum_result = self.curriculum_agent.analyze(profile)
        agent_logs.append(curriculum_result.dict())
        
        eligible_courses = curriculum_result.output['eligible_courses']
        
        if not eligible_courses:
            return {
                "schedules": [],
                "agent_logs": agent_logs,
                "error": "No eligible courses found based on completed prerequisites"
            }
        
        # Step 2: Policy Agent
        print("📋 Running Policy Agent...")
        policy_result = self.policy_agent.check_policies(profile, eligible_courses)
        agent_logs.append(policy_result.dict())
        
        available_sections = policy_result.output['available_sections']
        sections_by_course = policy_result.output['sections_by_course']
        credit_limits = policy_result.output['credit_limits']
        
        if not available_sections:
            return {
                "schedules": [],
                "agent_logs": agent_logs,
                "error": "No available sections found for eligible courses"
            }
        
        # Step 3: Preference Agent
        print("⚙️ Running Preference Agent...")
        preference_result = self.preference_agent.filter_by_preferences(
            profile, 
            available_sections
        )
        agent_logs.append(preference_result.dict())
        
        filtered_sections = preference_result.output['filtered_sections']
        
        # Rebuild sections_by_course with filtered sections
        filtered_sections_by_course = {}
        for section in filtered_sections:
            course_code = section['course_code']
            if course_code not in filtered_sections_by_course:
                filtered_sections_by_course[course_code] = []
            filtered_sections_by_course[course_code].append(section)
        
        # Step 4: Optimization Agent
        print("🎯 Running Optimization Agent...")
        schedules = self.optimization_agent.generate_schedules(
            profile,
            filtered_sections_by_course,
            credit_limits
        )
        
        if not schedules:
            return {
                "schedules": [],
                "agent_logs": agent_logs,
                "error": "Could not generate valid schedules with given constraints"
            }
        
        # Step 5: Conflict Agent
        print("🔍 Running Conflict Agent...")
        conflict_result = self.conflict_agent.resolve(schedules)
        agent_logs.append(conflict_result.dict())
        
        return {
            "schedules": [s.dict() for s in schedules],
            "agent_logs": agent_logs,
            "success": True
        }