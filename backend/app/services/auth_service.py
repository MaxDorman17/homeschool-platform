from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID, uuid4

from fastapi import HTTPException, status
from jose import jwt
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    verify_token,
)
from app.models.models import User, Session


async def register_user(db: AsyncSession, email: str, username: str, password: str, full_name: str, role: str = "parent") -> User:
    existing = await db.execute(
        select(User).where(or_(User.email == email, User.username == username))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User with this email or username already exists",
        )

    user = User(
        email=email,
        username=username,
        password_hash=get_password_hash(password),
        full_name=full_name,
        role=role,
        verification_token=uuid4(),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def authenticate_user(db: AsyncSession, username: str, password: str) -> User:
    result = await db.execute(
        select(User).where(User.username == username)
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is deactivated",
        )

    user.last_login = datetime.now(timezone.utc)
    await db.commit()
    return user


async def verify_email(db: AsyncSession, token: str) -> bool:
    try:
        token_uuid = UUID(token)
    except ValueError:
        return False

    result = await db.execute(
        select(User).where(User.verification_token == token_uuid)
    )
    user = result.scalar_one_or_none()
    if not user:
        return False

    user.is_verified = True
    user.verification_token = None
    await db.commit()
    return True


async def reset_password_request(db: AsyncSession, email: str) -> Optional[User]:
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user:
        return None

    user.reset_token = uuid4()
    user.reset_token_expires = datetime.now(timezone.utc) + timedelta(hours=1)
    await db.commit()
    await db.refresh(user)
    return user


async def reset_password(db: AsyncSession, token: str, new_password: str) -> bool:
    try:
        token_uuid = UUID(token)
    except ValueError:
        return False

    result = await db.execute(
        select(User).where(
            User.reset_token == token_uuid,
            User.reset_token_expires > datetime.now(timezone.utc),
        )
    )
    user = result.scalar_one_or_none()
    if not user:
        return False

    user.password_hash = get_password_hash(new_password)
    user.reset_token = None
    user.reset_token_expires = None
    await db.commit()
    return True


async def create_session(
    db: AsyncSession,
    user_id: UUID,
    access_token: str,
    refresh_token: str,
    device_info: Optional[str] = None,
    ip_address: Optional[str] = None,
) -> Session:
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    session = Session(
        user_id=user_id,
        token=access_token,
        refresh_token=refresh_token,
        device_info=device_info,
        ip_address=ip_address,
        expires_at=expires_at,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


async def revoke_session(db: AsyncSession, token: str) -> bool:
    result = await db.execute(
        select(Session).where(Session.token == token, Session.revoked == False)
    )
    session = result.scalar_one_or_none()
    if not session:
        return False

    session.revoked = True
    await db.commit()
    return True


async def refresh_access_token(db: AsyncSession, refresh_token: str) -> dict:
    payload = verify_token(refresh_token, "refresh")
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    result = await db.execute(
        select(Session).where(
            Session.refresh_token == refresh_token,
            Session.revoked == False,
            Session.expires_at > datetime.now(timezone.utc),
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or revoked",
        )

    result = await db.execute(select(User).where(User.id == UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    new_access = create_access_token({"sub": str(user.id), "role": user.role})
    new_refresh = create_refresh_token({"sub": str(user.id)})

    session.token = new_access
    session.refresh_token = new_refresh
    session.expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    await db.commit()

    return {
        "access_token": new_access,
        "refresh_token": new_refresh,
        "token_type": "bearer",
        "user": user,
    }
