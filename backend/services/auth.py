import os
import time
import hmac
import hashlib
import secrets
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from database import get_db
from models import User

SECRET_KEY = os.getenv("DEBUG_SECRET_KEY", "lifesaver-debug-2026")

security = HTTPBearer()

def hash_password(password: str) -> str:
    """Hash password using PBKDF2 from standard library (no external bcrypt needed)."""
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    )
    return f"{salt}${key.hex()}"

def verify_password(password: str, hashed: str) -> bool:
    """Verify password by rebuilding key with stored salt."""
    if not hashed:
        return False
    try:
        salt, key_hex = hashed.split('$')
        key = hashlib.pbkdf2_hmac(
            'sha256',
            password.encode('utf-8'),
            salt.encode('utf-8'),
            100000
        )
        return secrets.compare_digest(key.hex(), key_hex)
    except Exception:
        return False

def create_token(user_id: int, expires_in: int = 86400 * 30) -> str:
    """Create a signed bearer token containing user_id and expiration."""
    expiration = int(time.time()) + expires_in
    payload = f"{user_id}.{expiration}"
    signature = hmac.new(
        SECRET_KEY.encode('utf-8'),
        payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    return f"{payload}.{signature}"

def verify_token(token: str) -> int | None:
    """Verify bearer token signature and return user_id if valid."""
    try:
        parts = token.split('.')
        if len(parts) != 3:
            return None
        user_id_str, expiration_str, signature = parts
        expiration = int(expiration_str)
        if expiration < time.time():
            return None  # Token expired
        
        payload = f"{user_id_str}.{expiration}"
        expected_signature = hmac.new(
            SECRET_KEY.encode('utf-8'),
            payload.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        if secrets.compare_digest(signature, expected_signature):
            return int(user_id_str)
    except Exception:
        return None
    return None

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Dependency to retrieve currently authenticated user."""
    token = credentials.credentials
    user_id = verify_token(token)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return user
