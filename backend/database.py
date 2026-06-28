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
