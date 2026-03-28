from typing import List
from models.schema import ScheduleOption, AgentResponse

class ConflictAgent:
    def resolve(self, schedules: List[ScheduleOption]) -> AgentResponse:
        """Check for conflicts and flag issues"""
        
        flagged_schedules = []
        
        for schedule in schedules:
            issues = []
            
            # Check for back-to-back classes without breaks
            sorted_sections = sorted(schedule.sections, key=lambda s: s.start_time)
            for i in range(len(sorted_sections) - 1):
                if sorted_sections[i].end_time == sorted_sections[i+1].start_time:
                    issues.append("Back-to-back classes detected")
            
            # Check for very long days
            if sorted_sections:
                first = sorted_sections[0].start_time
                last = sorted_sections[-1].end_time
                
                first_mins = self._time_to_minutes(first)
                last_mins = self._time_to_minutes(last)
                
                if (last_mins - first_mins) > 420:  # More than 7 hours
                    issues.append("Long day (7+ hours)")
            
            flagged_schedules.append({
                "schedule": schedule,
                "issues": issues
            })
        
        reasoning = (
            f"Analyzed {len(schedules)} schedules for conflicts. "
            f"Found {sum(len(s['issues']) for s in flagged_schedules)} potential issues."
        )
        
        return AgentResponse(
            agent_name="Conflict Agent",
            output={"flagged_schedules": flagged_schedules},
            reasoning=reasoning
        )
    
    def _time_to_minutes(self, time_str: str) -> int:
        hours, minutes = map(int, time_str.split(':'))
        return hours * 60 + minutes