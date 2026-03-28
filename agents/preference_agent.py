from typing import List
from datetime import datetime
from models.schema import Section, StudentProfile, AgentResponse

class PreferenceAgent:
    def filter_by_preferences(self, profile: StudentProfile, sections: List[dict]) -> AgentResponse:
        """Apply student preferences to filter sections"""
        
        filtered_sections = []
        removed_count = {"mornings": 0, "fridays": 0, "other": 0}
        
        for section_dict in sections:
            section = Section(**section_dict)
            
            # Check time preferences
            start_hour = int(section.start_time.split(':')[0])
            
            # Filter out morning classes if requested
            if profile.no_mornings and start_hour < 10:
                removed_count["mornings"] += 1
                continue
            
            # Filter out Friday classes if requested
            if profile.no_fridays and 'F' in section.meeting_days:
                removed_count["fridays"] += 1
                continue
            
            filtered_sections.append(section_dict)
        
        reasoning = (
            f"Applied student preferences. "
            f"Removed {removed_count['mornings']} morning sections (before 10am), "
            f"{removed_count['fridays']} Friday sections. "
            f"{len(filtered_sections)} sections remain after filtering."
        )
        
        return AgentResponse(
            agent_name="Preference Agent",
            output={
                "filtered_sections": filtered_sections,
                "removed_count": removed_count
            },
            reasoning=reasoning
        )