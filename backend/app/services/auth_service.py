from sqlalchemy.orm import Session
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from ..models.user import User
from ..utils.security import hash_password, verify_password, create_access_token, decode_token
from ..database import get_db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def register_user(db: Session, email: str, password: str) -> User:
    existing = db.query(User).filter(User.email == email.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=email.lower(),
        hashed_password=hash_password(password)
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def authenticate_user(db: Session, email: str, password: str):
    user = db.query(User).filter(User.email == email.lower()).first()
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return user
