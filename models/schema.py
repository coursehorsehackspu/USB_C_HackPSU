from pydantic import BaseModel
from typing import List, Optional
from enum import Enum

class DifficultyLevel(str, Enum):
    INTRO = "intro"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"

class WorkloadPreference(str, Enum):
    LIGHT = "light"
    MODERATE = "moderate"
    HEAVY = "heavy"

class Course(BaseModel):
    code: str
    title: str
    credits: int
    department: str
    description: Optional[str] = ""
    difficulty_level: DifficultyLevel = DifficultyLevel.INTERMEDIATE
    avg_workload_hours: float = 8.0
    has_lab: bool = False
    has_project: bool = False

class Section(BaseModel):
    section_number: str
    course_code: str
    semester: str
    year: int
    meeting_days: str  # "MWF", "TTh"
    start_time: str    # "10:00"
    end_time: str      # "10:50"
    building: Optional[str] = ""
    room: Optional[str] = ""
    instructor_name: Optional[str] = ""
    instructor_rating: Optional[float] = None
    total_seats: int
    enrolled_count: int
    is_open: bool = True
    is_online: bool = False

class StudentProfile(BaseModel):
    major: str
    current_semester: int
    completed_courses: List[str]
    max_credits: int = 15
    no_mornings: bool = False  # No classes before 10am
    no_fridays: bool = False
    workload_preference: WorkloadPreference = WorkloadPreference.MODERATE
    must_take_courses: Optional[List[str]] = []

class ScheduleOption(BaseModel):
    sections: List[Section]
    total_credits: int
    score: float
    reasoning: dict  # Agent explanations

class AgentResponse(BaseModel):
    agent_name: str
    output: dict
    reasoning: str