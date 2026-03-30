import os
from datetime import datetime, timedelta

import bcrypt
import jwt
from dotenv import load_dotenv
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from database import db

load_dotenv()

security = HTTPBearer()

SECRET_KEY = os.getenv("SECRET_KEY", "ma_cle_secrete_super_securisee")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 10080  # 7 days


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plain password against bcrypt hash."""
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8"),
    )


def create_access_token(data: dict) -> str:
    """Create a JWT with the given data and expiration."""
    to_encode = data.copy()
    to_encode.update({"exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Extract and validate JWT token, then fetch user from database."""
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

    email = payload.get("email")
    role = payload.get("role")
    if not email or not role:
        raise HTTPException(status_code=401, detail="Invalid token")

    if role == "ADMIN":
        user = await db.admins.find_one({"email": email})
    elif role == "CANDIDATE":
        user = await db.candidates.find_one({"email": email})
    elif role == "RECRUITER":
        user = await db.recruiters.find_one({"email": email})
    else:
        raise HTTPException(status_code=401, detail="Invalid token")

    if user is None:
        raise HTTPException(status_code=401, detail="User not found")

    return user


async def get_current_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """Ensure the current user is an administrator."""
    if current_user.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Access denied. Administrator privileges required.")
    return current_user


async def get_current_recruiter(current_user: dict = Depends(get_current_user)) -> dict:
    """Ensure the current user is a recruiter."""
    if current_user.get("role") != "RECRUITER":
        raise HTTPException(status_code=403, detail="Access denied. Recruiter privileges required.")
    return current_user


async def get_current_candidate(current_user: dict = Depends(get_current_user)) -> dict:
    """Ensure the current user is a candidate."""
    if current_user.get("role") != "CANDIDATE":
        raise HTTPException(status_code=403, detail="Access denied. Candidate privileges required.")
    return current_user
