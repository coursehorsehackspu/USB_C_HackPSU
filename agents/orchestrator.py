from typing import Dict
from models.schema import StudentProfile, ScheduleOption
from agents.curriculum_agent import CurriculumAgent
from agents.policy_agent import PolicyAgent
from agents.preference_agent import PreferenceAgent
from agents.optimization_agent import OptimizationAgent
from agents.conflict_agent import ConflictAgent
from agents.gemini_helper import GeminiHelper


class Orchestrator:
    """
    Orchestrates the multi-agent system for course scheduling.
    Coordinates curriculum, policy, preference, optimization, and conflict agents.
    """
    
    def __init__(self):
        self.curriculum_agent = CurriculumAgent()
        self.policy_agent = PolicyAgent()
        self.preference_agent = PreferenceAgent()
        self.optimization_agent = OptimizationAgent()
        self.conflict_agent = ConflictAgent()
        self.gemini = GeminiHelper()
    
    def generate_schedules(self, profile: StudentProfile) -> Dict:
        """
        Coordinate all agents to generate optimized schedules.
        
        Workflow:
        1. Curriculum Agent: Determine eligible courses
        2. Policy Agent: Filter by university policies
        3. Preference Agent: Apply student preferences
        4. Optimization Agent: Generate schedule combinations
        5. Conflict Agent: Resolve scheduling conflicts
        6. Gemini: Add AI explanations
        
        Args:
            profile: Student profile with major, constraints, preferences
            
        Returns:
            Dictionary with schedules and agent logs
        """
        
        agent_logs = []
        
        # Step 1: Curriculum Agent
        print("Running Curriculum Agent...")
        curriculum_result = self.curriculum_agent.analyze(profile)
        agent_logs.append(curriculum_result.dict())
        
        eligible_courses = curriculum_result.output.get('eligible_courses', [])
        
        if not eligible_courses:
            return {
                "schedules": [],
                "agent_logs": agent_logs,
                "error": "No eligible courses found based on completed prerequisites"
            }
        
        # Step 2: Policy Agent
        print("Running Policy Agent...")
        policy_result = self.policy_agent.check_policies(profile, eligible_courses)
        agent_logs.append(policy_result.dict())
        
        available_sections = policy_result.output.get('available_sections', [])
        sections_by_course = policy_result.output.get('sections_by_course', {})
        credit_limits = policy_result.output.get('credit_limits', {"min": 12, "max": 18})
        
        if not available_sections:
            return {
                "schedules": [],
                "agent_logs": agent_logs,
                "error": "No available sections found for eligible courses"
            }
        
        # Step 3: Preference Agent
        print("Running Preference Agent...")
        preference_result = self.preference_agent.filter_by_preferences(
            profile, 
            available_sections
        )
        agent_logs.append(preference_result.dict())
        
        filtered_sections = preference_result.output.get('filtered_sections', [])
        
        if not filtered_sections:
            return {
                "schedules": [],
                "agent_logs": agent_logs,
                "error": "No sections match your preferences. Try relaxing constraints."
            }
        
        # Rebuild sections_by_course with filtered sections
        filtered_sections_by_course = {}
        for section in filtered_sections:
            course_code = section.get('course_code')
            if course_code not in filtered_sections_by_course:
                filtered_sections_by_course[course_code] = []
            filtered_sections_by_course[course_code].append(section)
        
        # Step 4: Optimization Agent
        print("Running Optimization Agent...")
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
        print("Running Conflict Agent...")
        conflict_result = self.conflict_agent.resolve(schedules)
        agent_logs.append(conflict_result.dict())
        
        # Step 6: Add AI Explanations with Gemini
        print("Generating AI explanations...")
        for schedule in schedules:
            try:
                ai_explanation = self.gemini.explain_schedule({
                    'courses': [s.course_code for s in schedule.sections],
                    'total_credits': schedule.total_credits,
                    'score': schedule.score
                })
                # Add explanation to reasoning dictionary
                if isinstance(schedule.reasoning, dict):
                    schedule.reasoning['ai_explanation'] = ai_explanation
                else:
                    # If reasoning is a Pydantic model, convert to dict first
                    reasoning_dict = schedule.reasoning.dict() if hasattr(schedule.reasoning, 'dict') else {}
                    reasoning_dict['ai_explanation'] = ai_explanation
                    schedule.reasoning = reasoning_dict
            except Exception as e:
                print(f"⚠️ Could not generate AI explanation: {e}")
                # Continue without AI explanation if it fails
        
        return {
            "schedules": [s.dict() for s in schedules],
            "agent_logs": agent_logs,
            "success": True
        }