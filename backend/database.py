import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set in .env")

# Build engine for PostgreSQL (Supabase)
engine = create_engine(
    DATABASE_URL,
    pool_size=5,         # Persistent connections
    max_overflow=10,     # Extra connections under load
    pool_pre_ping=True,  # Test connection before using
    pool_recycle=300,    # Recycle connections every 5 minutes
)

SessionLocal = sessionmaker(bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def run_migrations():
    """Inspect tables and add email, hashed_password, and completion_tip columns if they don't exist."""
    from sqlalchemy import inspect, text
    inspector = inspect(engine)
    
    # Ensure tables exist first
    Base.metadata.create_all(bind=engine)
    
    try:
        user_columns = [col['name'] for col in inspector.get_columns('users')]
        with engine.begin() as conn:
            if 'email' not in user_columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN email VARCHAR(255) UNIQUE"))
                print("Migration: Added email column to users table.")
            if 'hashed_password' not in user_columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN hashed_password VARCHAR(255)"))
                print("Migration: Added hashed_password column to users table.")
                
        task_columns = [col['name'] for col in inspector.get_columns('tasks')]
        with engine.begin() as conn:
            if 'completion_tip' not in task_columns:
                # PostgreSQL TEXT or SQLite TEXT is standard
                conn.execute(text("ALTER TABLE tasks ADD COLUMN completion_tip TEXT"))
                print("Migration: Added completion_tip column to tasks table.")
    except Exception as e:
        print(f"Migration error: {e}")

