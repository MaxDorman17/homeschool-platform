"""Rewards CRUD API."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Reward, UserRole
from app.schemas import RewardCreate, RewardResponse
from app.auth import get_current_user, require_parent, require_child

router = APIRouter(prefix="/api/v1/rewards", tags=["Rewards"])


@router.post("", response_model=RewardResponse, status_code=201)
def create_reward(
    req: RewardCreate,
    current_user: User = Depends(require_parent),
    db: Session = Depends(get_db)
):
    """Parent creates a new reward."""
    reward = Reward(
        parent_id=current_user.id,
        title=req.name,
        points_cost=req.points_cost,
        description=req.description,
        is_active=True
    )
    db.add(reward)
    db.commit()
    db.refresh(reward)
    return reward


@router.get("", response_model=list[RewardResponse])
def list_rewards(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all rewards for the parent."""
    if current_user.role == UserRole.PARENT:
        rewards = db.query(Reward).filter(
            Reward.parent_id == current_user.id,
            Reward.is_active == True
        ).order_by(Reward.points_cost.asc()).all()
    else:
        # Children can see rewards but can't redeem them
        from app.models import ChildProfile
        child = db.query(ChildProfile).filter(
            ChildProfile.user_id == current_user.id
        ).first()
        if child:
            rewards = db.query(Reward).filter(
                Reward.parent_id == child.parent_id,
                Reward.is_active == True
            ).order_by(Reward.points_cost.asc()).all()
        else:
            rewards = []
    
    return rewards


@router.get("/{reward_id}", response_model=RewardResponse)
def get_reward(
    reward_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a single reward."""
    reward = db.query(Reward).filter(Reward.id == reward_id).first()
    if not reward:
        raise HTTPException(status_code=404, detail="Reward not found")
    return reward


@router.delete("/{reward_id}", status_code=204)
def delete_reward(
    reward_id: int,
    current_user: User = Depends(require_parent),
    db: Session = Depends(get_db)
):
    """Delete a reward."""
    reward = db.query(Reward).filter(
        Reward.id == reward_id,
        Reward.parent_id == current_user.id
    ).first()
    if not reward:
        raise HTTPException(status_code=404, detail="Reward not found")
    
    db.delete(reward)
    db.commit()
    return None


@router.post("/{reward_id}/redeem", response_model=dict)
def redeem_reward(
    reward_id: int,
    current_user: User = Depends(require_child),
    db: Session = Depends(get_db)
):
    """Child redeems a reward using their points."""
    from app.models import ChildProfile
    child = db.query(ChildProfile).filter(
        ChildProfile.user_id == current_user.id
    ).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child profile not found")
    
    reward = db.query(Reward).filter(Reward.id == reward_id).first()
    if not reward:
        raise HTTPException(status_code=404, detail="Reward not found")
    
    if child.user.points_balance < reward.points_cost:
        raise HTTPException(
            status_code=400,
            detail="Not enough points to redeem this reward"
        )
    
    # Deduct points
    child.user.points_balance -= reward.points_cost
    db.commit()
    
    return {
        "message": f"Reward '{reward.name}' redeemed successfully!",
        "remaining_points": child.user.points_balance
    }
