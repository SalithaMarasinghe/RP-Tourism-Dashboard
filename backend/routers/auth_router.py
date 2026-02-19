from fastapi import APIRouter, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Optional
import firebase_admin
from firebase_admin import auth as firebase_auth, firestore
from datetime import datetime

router = APIRouter(prefix="/api/auth", tags=["auth"])
security = HTTPBearer()


# ---------- Models ----------

class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    firstName: str
    lastName: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class GoogleAuthRequest(BaseModel):
    idToken: str


class ProfileUpdateRequest(BaseModel):
    firstName: Optional[str] = None
    lastName: Optional[str] = None


# ---------- Helpers ----------

def get_firestore_client():
    return firestore.client()


async def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)) -> dict:
    """Verify Firebase ID token and return decoded token."""
    try:
        decoded = firebase_auth.verify_id_token(credentials.credentials)
        return decoded
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")


def get_user_doc(uid: str) -> dict:
    """Fetch user profile from Firestore."""
    db = get_firestore_client()
    doc = db.collection("users").document(uid).get()
    if doc.exists:
        return doc.to_dict()
    return {}


# ---------- Endpoints ----------

@router.post("/signup")
async def signup(body: SignupRequest):
    """
    Create a new Firebase Auth user + Firestore profile.
    Returns a custom token the frontend uses with signInWithCustomToken().
    """
    try:
        user = firebase_auth.create_user(
            email=body.email,
            password=body.password,
            display_name=f"{body.firstName} {body.lastName}"
        )
    except firebase_auth.EmailAlreadyExistsError:
        raise HTTPException(status_code=400, detail="Email already in use")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Create Firestore profile
    db = get_firestore_client()
    db.collection("users").document(user.uid).set({
        "email": body.email,
        "firstName": body.firstName,
        "lastName": body.lastName,
        "createdAt": datetime.utcnow().isoformat(),
        "role": "user"
    })

    # Return custom token for client to call signInWithCustomToken()
    custom_token = firebase_auth.create_custom_token(user.uid)
    return {
        "customToken": custom_token.decode("utf-8"),
        "uid": user.uid,
        "email": body.email,
        "firstName": body.firstName,
        "lastName": body.lastName
    }


@router.post("/google")
async def google_auth(body: GoogleAuthRequest):
    """
    Verify Google OAuth idToken, ensure Firestore user profile exists.
    Called after signInWithPopup() on the frontend.
    """
    try:
        decoded = firebase_auth.verify_id_token(body.idToken)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid Google token: {str(e)}")

    uid = decoded["uid"]
    db = get_firestore_client()
    user_ref = db.collection("users").document(uid)
    doc = user_ref.get()

    if not doc.exists:
        # New Google user — create profile
        display_name = decoded.get("name", "")
        parts = display_name.split(" ")
        first_name = parts[0] if parts else "User"
        last_name = " ".join(parts[1:]) if len(parts) > 1 else ""

        user_ref.set({
            "email": decoded.get("email", ""),
            "firstName": first_name,
            "lastName": last_name,
            "createdAt": datetime.utcnow().isoformat(),
            "role": "user"
        })
        profile = {"firstName": first_name, "lastName": last_name, "role": "user"}
    else:
        profile = doc.to_dict()

    return {"uid": uid, "profile": profile}


@router.get("/me")
async def get_me(credentials: HTTPAuthorizationCredentials = Security(security)):
    """Return the authenticated user's Firestore profile."""
    decoded = await verify_token(credentials)
    uid = decoded["uid"]
    profile = get_user_doc(uid)
    if not profile:
        raise HTTPException(status_code=404, detail="User profile not found")
    return {"uid": uid, **profile}


@router.put("/profile")
async def update_profile(
    body: ProfileUpdateRequest,
    credentials: HTTPAuthorizationCredentials = Security(security)
):
    """Update firstName / lastName in Firestore."""
    decoded = await verify_token(credentials)
    uid = decoded["uid"]

    updates = {k: v for k, v in body.dict().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    db = get_firestore_client()
    db.collection("users").document(uid).update(updates)
    return {"success": True, "updated": updates}


@router.delete("/profile")
async def delete_profile(credentials: HTTPAuthorizationCredentials = Security(security)):
    """Delete user Firestore doc + Firebase Auth account."""
    decoded = await verify_token(credentials)
    uid = decoded["uid"]

    db = get_firestore_client()
    # Delete Firestore profile
    db.collection("users").document(uid).delete()
    # Delete Firebase Auth user
    firebase_auth.delete_user(uid)

    return {"success": True, "message": "Account deleted"}
