from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from models.schema import StudentProfile
from agents.orchestrator import Orchestrator
import uvicorn

app = FastAPI(title="DegreeFlow API")

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

orchestrator = Orchestrator()

@app.get("/")
def root():
    return {"message": "DegreeFlow API is running", "version": "1.0.0"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.post("/api/generate-schedule")
def generate_schedule(profile: StudentProfile):
    """
    Generate optimized course schedules based on student profile
    """
    try:
        result = orchestrator.generate_schedules(profile)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/courses")
def get_courses():
    """Get all available courses"""
    import json
    with open('data/courses.json', 'r') as f:
        return json.load(f)

@app.get("/api/sections")
def get_sections():
    """Get all available sections"""
    import json
    with open('data/sections.json', 'r') as f:
        return json.load(f)

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)