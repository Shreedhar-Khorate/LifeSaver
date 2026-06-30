"""
Life Saver API — Main Application
Multi-Agent LLM Orchestration for deadline crisis management.
"""
import sys
import os
from contextlib import asynccontextmanager

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from database import Base, engine, SessionLocal, run_migrations
from models import User
from routes.tasks import router as tasks_router
from routes.scheduler import router as scheduler_router
from routes.rescue import router as rescue_router
from routes.dashboard import router as dashboard_router
from routes.debug import router as debug_router
from routes.auth import router as auth_router
from services.auth import hash_password

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Run auto-migrations for email and hashed_password columns
    run_migrations()
    
    db = SessionLocal()
    try:
        demo_user = db.query(User).filter(User.id == 1).first()
        demo_hashed = hash_password("password123")
        
        if not demo_user:
            db.add(User(
                id=1,
                name="Demo User",
                email="demo@lifesaver.com",
                hashed_password=demo_hashed,
                dna_type="consistent",
                available_hours=6.0
            ))
            db.commit()
        else:
            # Migration support: update existing user id=1 if email is missing
            if not demo_user.email:
                demo_user.email = "demo@lifesaver.com"
                demo_user.hashed_password = demo_hashed
                db.commit()
    finally:
        db.close()
    yield


app = FastAPI(
    title="Life Saver API",
    description="Multi-Agent LLM Orchestration for deadline crisis management",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all route routers
app.include_router(auth_router)
app.include_router(tasks_router)
app.include_router(scheduler_router)
app.include_router(rescue_router)
app.include_router(dashboard_router)
app.include_router(debug_router)



@app.get("/")
def read_root():
    return {"message": "Life Saver API is running successfully!"}


@app.get("/api/health")
def health_check():
    return {"status": "healthy", "service": "Life Saver Backend"}
