"""Main FastAPI application."""
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import os

from app.database import init_db
from app.api import auth, lessons, worksheets, quizzes, schedules, progress, dashboard, rewards, subjects, units

# Create app
app = FastAPI(
    title="Homeschool Platform",
    version="1.0.0",
    description="A comprehensive home education platform for parents and children"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database
init_db()

# Include routers
app.include_router(auth.router)
app.include_router(lessons.router)
app.include_router(worksheets.router)
app.include_router(quizzes.router)
app.include_router(schedules.router)
app.include_router(progress.router)
app.include_router(dashboard.router)
app.include_router(rewards.router)
app.include_router(subjects.router)
app.include_router(units.router)


@app.get("/api/v1/health")
def health_check():
    return {"status": "ok", "message": "Homeschool Platform API is running"}


# Serve uploaded files
upload_path = os.path.join(os.path.dirname(__file__), "..", "uploads")
if os.path.exists(upload_path):
    app.mount("/uploads", StaticFiles(directory=upload_path), name="uploads")


# Serve frontend static files
frontend_path = os.path.join(os.path.dirname(__file__), "..", "frontend")
if os.path.exists(frontend_path):
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")
