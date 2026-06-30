"""
Auth API — User registration, login, and profile management
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import User
from schemas import UserRegister, UserLogin, UserUpdate, AuthResponse, UserProfileResponse
from services.auth import hash_password, verify_password, create_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["Auth"])


from sqlalchemy import func


@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def signup(req: UserRegister, db: Session = Depends(get_db)):
    """Register a new user account."""
    email_clean = req.email.lower().strip()
    
    # Check if user already exists
    existing = db.query(User).filter(User.email == email_clean).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists."
        )
    
    # Get next available user ID (since existing postgres users table has no serial default sequence)
    max_id = db.query(func.max(User.id)).scalar() or 0
    next_id = max_id + 1

    # Create new user
    hashed = hash_password(req.password)
    user = User(
        id=next_id,
        name=req.name.strip(),
        email=email_clean,
        hashed_password=hashed,
        dna_type="consistent",
        available_hours=6.0,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Generate token
    token = create_token(user.id)
    return AuthResponse(
        token=token,
        user_id=user.id,
        name=user.name,
        email=user.email,
    )


@router.post("/login", response_model=AuthResponse)
def login(req: UserLogin, db: Session = Depends(get_db)):
    """Authenticate an existing user."""
    email_clean = req.email.lower().strip()
    user = db.query(User).filter(User.email == email_clean).first()
    
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )
    
    # Generate token
    token = create_token(user.id)
    return AuthResponse(
        token=token,
        user_id=user.id,
        name=user.name,
        email=user.email,
    )


@router.get("/me", response_model=UserProfileResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Get the current authenticated user's profile details."""
    return current_user


@router.patch("/profile", response_model=UserProfileResponse)
def update_profile(
    req: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update profile settings for the authenticated user."""
    if req.name is not None:
        current_user.name = req.name.strip()
    if req.available_hours is not None:
        current_user.available_hours = req.available_hours
    if req.peak_hours is not None:
        current_user.peak_hours = req.peak_hours
        
    db.commit()
    db.refresh(current_user)
    return current_user
