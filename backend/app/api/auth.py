"""Auth API: register, login, profile management."""
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, UserRole, ParentProfile, ChildProfile
from app.schemas import (
    LoginRequest, TokenResponse, UserResponse,
    RegisterParentRequest, CreateChildRequest, UpdateProfileRequest,
    ChildProfileResponse, ChildDashboard, LessonOfDay,
    BadgeResponse, RewardResponse
)
from app.auth import (
    verify_password, get_password_hash, create_access_token,
    get_current_user, require_parent, require_child,
    create_reset_token, verify_reset_token, mark_token_used
)
from app.services.gamification import add_points, update_streak, calculate_level, xp_to_next_level

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])


@router.post("/register-parent", response_model=UserResponse)
def register_parent(req: RegisterParentRequest, db: Session = Depends(get_db)):
    """Register a new parent account."""
    # Check for existing username/email
    if db.query(User).filter(User.username == req.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        username=req.username,
        email=req.email,
        full_name=req.full_name,
        hashed_password=get_password_hash(req.password),
        role=UserRole.PARENT
    )
    db.add(user)
    db.flush()

    profile = ParentProfile(user_id=user.id, bio=None)
    db.add(profile)
    db.commit()
    db.refresh(user)
    return user


@router.post("/register-child", response_model=UserResponse)
def register_child(req: CreateChildRequest, db: Session = Depends(get_db)):
    """Register a new child account (parent creates their child)."""
    if db.query(User).filter(User.username == req.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        username=req.username,
        email=req.email,
        full_name=req.full_name,
        hashed_password=get_password_hash(req.password),
        role=UserRole.CHILD
    )
    db.add(user)
    db.flush()

    child = ChildProfile(
        user_id=user.id,
        parent_id=0,  # Will be set by parent
        avatar_url=req.avatar_url
    )
    db.add(child)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    """Login and receive JWT token."""
    user = db.query(User).filter(User.username == req.username).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = create_access_token(data={"sub": str(user.id), "role": user.role.value})
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get current user profile with related data."""
    response = UserResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role.value,
        is_active=current_user.is_active,
        points_balance=current_user.points_balance or 0,
        current_streak=0,
        children=[],
        created_at=current_user.created_at
    )
    
    if current_user.role == UserRole.PARENT:
        # Get children
        child_profiles = db.query(ChildProfile).filter(
            ChildProfile.parent_id == current_user.id
        ).all()
        response.children = [
            {"id": cp.id, "user_id": cp.user_id, "full_name": cp.user.full_name, "username": cp.user.username, "level": cp.level, "current_streak": cp.current_streak}
            for cp in child_profiles
        ]
    
    elif current_user.role == UserRole.CHILD:
        child_profile = db.query(ChildProfile).filter(
            ChildProfile.user_id == current_user.id
        ).first()
        if child_profile:
            response.current_streak = child_profile.current_streak or 0
    
    return response


@router.put("/profile", response_model=UserResponse)
def update_profile(
    req: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user's profile."""
    if req.full_name:
        current_user.full_name = req.full_name
    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/child/{child_id}", response_model=ChildProfileResponse)
def get_child_profile(
    child_id: int,
    parent: User = Depends(require_parent),
    db: Session = Depends(get_db)
):
    """Parent gets their child's profile."""
    child = db.query(ChildProfile).filter(
        ChildProfile.id == child_id,
        ChildProfile.parent_id == parent.id
    ).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    return child


@router.get("/child/{child_id}/dashboard", response_model=ChildDashboard)
def get_child_dashboard(
    child_id: int,
    parent: User = Depends(require_parent),
    db: Session = Depends(get_db)
):
    """Parent gets their child's dashboard data."""
    child = db.query(ChildProfile).filter(
        ChildProfile.id == child_id,
        ChildProfile.parent_id == parent.id
    ).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")

    today = date.today()
    # Today's lessons
    today_lessons = []
    # ... schedule logic would go here
    # Simplified for now
    today_lessons = []

    # Pending counts
    pending_worksheets = 0
    pending_quizzes = 0

    # Recent badges
    badges = db.query(UserBadge).filter(
        UserBadge.child_id == child_id
    ).order_by(UserBadge.earned_at.desc()).limit(5).all()
    badge_responses = [BadgeResponse.from_orm(b) for b in badges]

    # Available rewards
    rewards = db.query(UserProfile).filter(
        UserProfile.id == child_id
    ).first()
    available_rewards = []
    # ... would query active rewards

    level = calculate_level(child.experience)
    xp_progress = xp_to_next_level(child.experience)

    return ChildDashboard(
        profile=ChildProfileResponse.from_orm(child),
        points_balance=child.user.points_balance if hasattr(child.user, 'points_balance') else 0,
        today_lessons=today_lessons,
        pending_worksheets=pending_worksheets,
        pending_quizzes=pending_quizzes,
        recent_badges=badge_responses,
        available_rewards=available_rewards,
        current_streak=child.current_streak,
        level_progress=xp_progress
    )


# ─── Password Reset & Username Reminder ───

@router.post("/forgot-username")
def forgot_username(req: dict, db: Session = Depends(get_db)):
    """Send username reminder email."""
    from app.services.email import send_reset_email
    from app.config import get_settings
    
    email = req.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    
    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        # Don't reveal if email exists or not
        return {"message": "If an account exists with that email, you'll receive your username."}
    
    # Generate reset token (reused for both password reset and username reminder)
    reset_token = create_reset_token(db, user.id)
    
    # Build reset URL
    frontend_url = "http://192.168.0.206"  # Will be configurable
    reset_url = f"{frontend_url}/reset-password.html?token={reset_token}&username={user.username}"
    
    success = send_reset_email(user.email, reset_url, user.full_name)
    
    if success:
        return {"message": f"Your username has been sent to {email}"}
    else:
        raise HTTPException(status_code=500, detail="Failed to send email")


@router.post("/forgot-password")
def forgot_password(req: dict, db: Session = Depends(get_db)):
    """Send password reset link email."""
    from app.services.email import send_reset_email
    from app.config import get_settings
    
    email = req.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    
    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        # Don't reveal if email exists or not
        return {"message": "If an account exists with that email, you'll receive a password reset link."}
    
    # Generate reset token
    reset_token = create_reset_token(db, user.id)
    
    # Build reset URL
    frontend_url = "http://192.168.0.206"  # Will be configurable
    reset_url = f"{frontend_url}/reset-password.html?token={reset_token}"
    
    success = send_reset_email(user.email, reset_url, user.full_name)
    
    if success:
        return {"message": f"A password reset link has been sent to {email}"}
    else:
        raise HTTPException(status_code=500, detail="Failed to send email")


@router.post("/reset-password")
def reset_password(req: dict, db: Session = Depends(get_db)):
    """Reset password using token."""
    token = req.get("token")
    new_password = req.get("password")
    
    if not token or not new_password:
        raise HTTPException(status_code=400, detail="Token and new password are required")
    
    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    
    # Verify token
    user = verify_reset_token(db, token)
    
    # Update password
    user.hashed_password = get_password_hash(new_password)
    mark_token_used(db, token)
    
    return {"message": "Password has been reset successfully"}
