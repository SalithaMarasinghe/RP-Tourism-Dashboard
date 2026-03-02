"""
auth_router.py
~~~~~~~~~~~~~~
FastAPI router for auth endpoints.
All Firebase Auth + Firestore logic lives in services.auth_service.
"""
import logging

from fastapi import APIRouter, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from auth import verify_token
from models.auth_models import (
    GoogleAuthRequest,
    PasswordChangeRequest,
    ProfileUpdateRequest,
    SignupRequest,
)
from services import auth_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])
security = HTTPBearer()


# ---------- Endpoints ----------

@router.post("/signup")
async def signup(body: SignupRequest):
    """Create a new Firebase Auth user + Firestore profile."""
    return auth_service.signup(
        body.email, body.password, body.firstName, body.lastName
    )


@router.post("/google")
async def google_auth(body: GoogleAuthRequest):
    """Verify Google OAuth idToken, ensure Firestore user profile exists."""
    return auth_service.verify_google_token(body.idToken)


@router.get("/me")
async def get_me(
    credentials: HTTPAuthorizationCredentials = Security(security),
):
    """Return the authenticated user's Firestore profile."""
    decoded = await verify_token(credentials)
    uid = decoded["uid"]
    profile = auth_service.get_user_profile(uid)
    if not profile:
        raise HTTPException(status_code=404, detail="User profile not found")
    return {"uid": uid, **profile}


@router.put("/profile")
async def update_profile(
    body: ProfileUpdateRequest,
    credentials: HTTPAuthorizationCredentials = Security(security),
):
    """Update firstName / lastName in Firestore."""
    decoded = await verify_token(credentials)
    updates = {k: v for k, v in body.dict().items() if v is not None}
    return auth_service.update_profile(decoded["uid"], updates)


@router.put("/password")
async def change_password(
    body: PasswordChangeRequest,
    credentials: HTTPAuthorizationCredentials = Security(security),
):
    """Change user password in Firebase Auth."""
    decoded = await verify_token(credentials)
    auth_service.change_password(decoded["uid"], body.newPassword)
    return {"success": True, "message": "Password updated successfully"}


@router.delete("/profile")
async def delete_profile(
    credentials: HTTPAuthorizationCredentials = Security(security),
):
    """Delete user Firestore doc + Firebase Auth account."""
    decoded = await verify_token(credentials)
    auth_service.delete_account(decoded["uid"])
    return {"success": True, "message": "Account deleted"}
