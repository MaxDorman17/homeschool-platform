from datetime import datetime, timedelta
from typing import Optional
import hashlib
import os
import json

from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models import User, UserRole

settings = get_settings()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")


# ─── Password Helpers (using PBKDF2-SHA256, no C extensions needed) ───

def get_password_hash(password: str) -> str:
    """Hash a password using PBKDF2-SHA256 with a random salt."""
    salt = os.urandom(32)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 480000)
    # Return format: salt:iterations:hash
    return f"{salt.hex()}:480000:{key.hex()}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    try:
        salt_hex, iterations, hash_hex = hashed_password.split(":")
        salt = bytes.fromhex(salt_hex)
        iterations = int(iterations)
        expected_hash = bytes.fromhex(hash_hex)
        key = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt, iterations)
        return key == expected_hash
    except (ValueError, IndexError):
        return False


# ─── JWT Token Helpers ───

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=7)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


# ─── Auth Dependencies ───

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """Extract and validate the current user from the JWT token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return user


def require_parent(current_user: User = Depends(get_current_user)) -> User:
    """Ensure the current user is a parent."""
    if current_user.role != UserRole.PARENT:
        raise HTTPException(status_code=403, detail="Parent access required")
    return current_user


def require_child(current_user: User = Depends(get_current_user)) -> User:
    """Ensure the current user is a child."""
    if current_user.role != UserRole.CHILD:
        raise HTTPException(status_code=403, detail="Child access required")
    return current_user


# ─── Password Reset Functions ───

def create_reset_token(db: Session, user_id: int) -> str:
    """Create a password reset token for a user."""
    from app.models import PasswordResetToken
    
    # Remove any existing unused tokens
    existing = db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user_id,
        PasswordResetToken.is_used == False
    ).all()
    for token in existing:
        db.delete(token)
    
    # Generate new token
    import secrets
    import string
    token_chars = string.ascii_letters + string.digits
    token_value = "rst_" + "".join(secrets.choice(token_chars) for _ in range(32))
    
    reset_token = PasswordResetToken(
        user_id=user_id,
        token=token_value,
        expires_at=datetime.utcnow() + timedelta(minutes=15)
    )
    
    db.add(reset_token)
    db.commit()
    db.refresh(reset_token)
    
    return token_value


def verify_reset_token(db: Session, token: str) -> User:
    """Verify a password reset token and return the associated user."""
    from app.models import PasswordResetToken
    
    reset_token = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == token,
        PasswordResetToken.is_used == False
    ).first()
    
    if not reset_token:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    if reset_token.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Reset token has expired")
    
    user = db.query(User).filter(User.id == reset_token.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user


def mark_token_used(db: Session, token: str) -> bool:
    """Mark a reset token as used."""
    from app.models import PasswordResetToken
    
    reset_token = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == token
    ).first()
    
    if reset_token:
        reset_token.is_used = True
        db.commit()
        return True
    return False
