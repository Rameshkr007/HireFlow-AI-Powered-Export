from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..schemas.profile import ExporterProfileCreate, ExporterProfileUpdate, ExporterProfileResponse
from ..services.auth_service import get_current_user
from ..models.user import User
from ..models.exporter_profile import ExporterProfile

router = APIRouter(prefix="/api/profile", tags=["profile"])

@router.get("", response_model=ExporterProfileResponse)
def get_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(ExporterProfile).filter(ExporterProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found. Please create your profile first.")
    return profile

@router.post("", response_model=ExporterProfileResponse)
def create_profile(data: ExporterProfileCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    existing = db.query(ExporterProfile).filter(ExporterProfile.user_id == current_user.id).first()
    if existing:
        for key, value in data.model_dump().items():
            setattr(existing, key, value)
        db.commit()
        db.refresh(existing)
        return existing
    profile = ExporterProfile(user_id=current_user.id, **data.model_dump())
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile

@router.put("", response_model=ExporterProfileResponse)
def update_profile(data: ExporterProfileUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(ExporterProfile).filter(ExporterProfile.user_id == current_user.id).first()
    if not profile:
        profile = ExporterProfile(user_id=current_user.id)
        db.add(profile)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(profile, key, value)
    db.commit()
    db.refresh(profile)
    return profile
