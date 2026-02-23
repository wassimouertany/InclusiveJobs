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
ACCESS_TOKEN_EXPIRE_MINUTES = 10080  # 7 jours


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Vérifie que le mot de passe en clair correspond au hash."""
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8"),
    )


def create_access_token(data: dict) -> str:
    """Crée un token JWT avec les données fournies et une date d'expiration."""
    to_encode = data.copy()
    to_encode.update({"exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Extrait et valide le token JWT, puis récupère l'utilisateur depuis la base."""
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expiré")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalide")

    email = payload.get("email")
    role = payload.get("role")
    if not email or not role:
        raise HTTPException(status_code=401, detail="Token invalide")

    if role == "ADMIN":
        user = await db.admins.find_one({"email": email})
    elif role == "CANDIDAT":
        user = await db.candidats.find_one({"email": email})
    elif role == "RECRUTEUR":
        user = await db.recruteurs.find_one({"email": email})
    else:
        raise HTTPException(status_code=401, detail="Token invalide")

    if user is None:
        raise HTTPException(status_code=401, detail="Utilisateur non trouvé")

    return user


async def get_current_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """Vérifie que l'utilisateur connecté est un administrateur."""
    if current_user.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Accès refusé. Privilèges administrateur requis.")
    return current_user
