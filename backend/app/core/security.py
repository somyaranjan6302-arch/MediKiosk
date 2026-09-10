import os
import hmac
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import settings

security_bearer = HTTPBearer(auto_error=False)

def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
    return f"{salt}${key.hex()}"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        salt, key_hex = hashed_password.split('$')
        new_key = hashlib.pbkdf2_hmac('sha256', plain_password.encode('utf-8'), salt.encode('utf-8'), 100000)
        return hmac.compare_digest(new_key.hex(), key_hex)
    except Exception:
        return False

# Seed staff accounts for local dev / testing fallback when Keycloak is offline
DEMO_STAFF_USERS = {
    "dr_arun": {
        "id": "staff-doc-001",
        "username": "dr_arun",
        "name": "Dr. Arun Verma (MD)",
        "role": "doctor",
        "email": "dr.arun@hospital.gov.in",
        "password_hash": hash_password("DoctorPass2026!")
    },
    "nurse_sunita": {
        "id": "staff-nur-002",
        "username": "nurse_sunita",
        "name": "Nurse Sunita Kaur",
        "role": "nurse",
        "email": "sunita.k@hospital.gov.in",
        "password_hash": hash_password("NursePass2026!")
    },
    "admin_rahul": {
        "id": "staff-adm-003",
        "username": "admin_rahul",
        "name": "Rahul Nair",
        "role": "admin",
        "email": "admin@hospital.gov.in",
        "password_hash": hash_password("AdminPass2026!")
    },
    "compliance_priya": {
        "id": "staff-cpl-004",
        "username": "compliance_priya",
        "name": "Priya Menon",
        "role": "compliance_officer",
        "email": "compliance@hospital.gov.in",
        "password_hash": hash_password("AuditPass2026!")
    }
}

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_token(token: str) -> Dict[str, Any]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except jwt.PyJWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer)) -> Dict[str, Any]:
    """
    Validates bearer token and returns actor details.
    For kiosk sessions where patient is interacting, can fallback to patient_kiosk role.
    """
    if not credentials:
        # Anonymous kiosk session fallback if token header is absent
        return {
            "actor_id": "anonymous_kiosk",
            "actor_name": "Kiosk Terminal",
            "role": "patient_kiosk"
        }
    
    token = credentials.credentials
    payload = decode_token(token)
    return {
        "actor_id": payload.get("sub", "unknown_actor"),
        "actor_name": payload.get("name", "Unknown"),
        "role": payload.get("role", "patient_kiosk"),
        "email": payload.get("email", "")
    }

def require_roles(allowed_roles: List[str]):
    def role_checker(current_user: Dict[str, Any] = Depends(get_current_user)):
        role = current_user.get("role")
        if role not in allowed_roles and "admin" not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{role}' is not authorized to access this clinical endpoint. Required: {allowed_roles}"
            )
        return current_user
    return role_checker
