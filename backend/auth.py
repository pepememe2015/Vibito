from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from models import SessionLocal, User
import secrets
import hashlib

from datetime import datetime, timedelta
from models import SessionLocal, User, UserSession

security = HTTPBearer()

import binascii
import os

def hash_password(password: str) -> str:
    """Hash a password using PBKDF2 with a random salt."""
    # تولید نمک تصادفی (Salt)
    salt = hashlib.sha256(os.urandom(60)).hexdigest().encode('ascii')
    # تولید هش با استفاده از PBKDF2
    pwdhash = hashlib.pbkdf2_hmac('sha512', password.encode('utf-8'), 
                                salt, 100000)
    pwdhash = binascii.hexlify(pwdhash)
    # ترکیب نمک و هش برای ذخیره در دیتابیس
    return (salt + pwdhash).decode('ascii')

def verify_password(plain: str, hashed: str) -> bool:
    """Verify a stored password against one provided by user"""
    try:
        # استخراج نمک (64 کاراکتر اول)
        salt = hashed[:64].encode('ascii')
        stored_hash = hashed[64:].encode('ascii')
        # محاسبه مجدد هش با پسورد ورودی و نمک قبلی
        pwdhash = hashlib.pbkdf2_hmac('sha512', plain.encode('utf-8'), 
                                    salt, 100000)
        pwdhash = binascii.hexlify(pwdhash)
        return pwdhash == stored_hash
    except Exception:
        return False

TOKEN_EXPIRE_DAYS = 30

def create_token(user_id: int, username: str, db: Session) -> str:
    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(days=TOKEN_EXPIRE_DAYS)
    
    # ذخیره در دیتابیس
    new_session = UserSession(
        token=token,
        user_id=user_id,
        expires_at=expires_at
    )
    db.add(new_session)
    db.commit()
    
    # پاکسازی نشست‌های منقضی شده
    db.query(UserSession).filter(UserSession.expires_at < datetime.utcnow()).delete()
    db.commit()
        
    return token

def revoke_token(token: str, db: Session):
    db.query(UserSession).filter(UserSession.token == token).delete()
    db.commit()

# ========== تابع دیتابیس برای auth ==========
def get_db_auth():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db_auth)):
    token = credentials.credentials
    
    # جستجو در دیتابیس
    session = db.query(UserSession).filter(UserSession.token == token).first()
    
    if not session:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    if session.expires_at < datetime.utcnow():
        db.delete(session)
        db.commit()
        raise HTTPException(status_code=401, detail="Token expired")

    user = db.query(User).filter(User.id == session.user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

def get_admin_user(current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user