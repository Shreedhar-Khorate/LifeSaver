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

from database import Base, engine, SessionLocal
from models import User
from routes.tasks import router as tasks_router
from routes.scheduler import router as scheduler_router
from routes.rescue import router as rescue_router
from routes.dashboard import router as dashboard_router
from routes.debug import router as debug_router
@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if not db.query(User).filter_by(id=1).first():
            db.add(User(id=1, name="Demo User"))
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
