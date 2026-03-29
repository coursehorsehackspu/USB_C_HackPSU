import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()

# Configure Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))


class GeminiHelper:
    """Helper class for Google Gemini AI integration"""
    
    def __init__(self):
        """Initialize Gemini Pro model"""
        self.model = genai.GenerativeModel('gemini-pro')
    
    def explain_schedule(self, schedule_data: dict) -> str:
        """
        Generate natural language explanation of a schedule.
        
        Args:
            schedule_data: Dictionary with courses, total_credits, score
            
        Returns:
            Friendly explanation string
        """
        try:
            courses = schedule_data.get('courses', [])
            total_credits = schedule_data.get('total_credits', 0)
            score = schedule_data.get('score', 0)
            
            prompt = f"""
            You are a helpful academic advisor. Explain this course schedule in 2-3 friendly sentences:
            
            Courses: {', '.join(courses)}
            Total Credits: {total_credits}
            Match Score: {score:.0f}/100
            
            Highlight what makes this schedule good and any important notes about the course selection.
            Keep it brief, friendly, and encouraging. Don't use bullet points.
            """
            
            response = self.model.generate_content(prompt)
            return response.text.strip()
            
        except Exception as e:
            print(f"Gemini API error: {e}")
            return "This schedule balances your requirements with your preferences."
    
    def get_course_recommendation(self, prompt: str) -> str:
        """
        Get AI recommendation for course selection (optional - for future use).
        
        Args:
            prompt: Question or request about course selection
            
        Returns:
            AI-generated recommendation
        """
        try:
            response = self.model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            print(f"Gemini error: {e}")
            return ""