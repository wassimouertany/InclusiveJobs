import os

import jwt
from dotenv import load_dotenv
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from database import db

load_dotenv()

security = HTTPBearer()

SECRET_KEY = os.getenv("SECRET_KEY", "ma_cle_secrete_super_securisee")
ALGORITHM = "HS256"


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

    if role == "CANDIDATE":
        user = await db.candidates.find_one({"email": email})
    elif role == "RECRUITER":
        user = await db.recruiters.find_one({"email": email})
    else:
        raise HTTPException(status_code=401, detail="Invalid token")

    if user is None:
        raise HTTPException(status_code=401, detail="User not found")

    return user


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
