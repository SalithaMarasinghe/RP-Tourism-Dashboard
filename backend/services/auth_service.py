"""
auth_service.py
~~~~~~~~~~~~~~~
All Firebase Auth + Firestore logic for the auth module.
No FastAPI / HTTP concerns live here.
"""
import logging
import os
import time
from datetime import datetime
from typing import Any, Dict, Optional

from fastapi import HTTPException
from firebase_admin import auth as firebase_auth, firestore

logger = logging.getLogger(__name__)
FIREBASE_CLOCK_SKEW_SECONDS = int(os.getenv("FIREBASE_CLOCK_SKEW_SECONDS", "60"))
EARLY_TOKEN_RETRY_SECONDS = float(os.getenv("FIREBASE_EARLY_TOKEN_RETRY_SECONDS", "1"))
EARLY_TOKEN_MAX_RETRIES = int(os.getenv("FIREBASE_EARLY_TOKEN_MAX_RETRIES", "2"))


# ── Utilities ────────────────────────────────────────────────────────────────

def get_db():
    """Return a Firestore client."""
    return firestore.client()


def get_user_profile(uid: str) -> Dict[str, Any]:
    """Fetch user profile from Firestore. Returns {} if not found."""
    db = get_db()
    doc = db.collection("users").document(uid).get()
    return doc.to_dict() if doc.exists else {}


# ── Auth operations ───────────────────────────────────────────────────────────

def signup(
    email: str,
    password: str,
    first_name: str,
    last_name: str,
) -> Dict[str, Any]:
    """
    Create a new Firebase Auth user and Firestore profile.
    Returns a custom token for the frontend to call signInWithCustomToken().
    """
    try:
        user = firebase_auth.create_user(
            email=email,
            password=password,
            display_name=f"{first_name} {last_name}",
        )
    except firebase_auth.EmailAlreadyExistsError:
        raise HTTPException(status_code=400, detail="Email already in use")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    db = get_db()
    db.collection("users").document(user.uid).set({
        "email": email,
        "firstName": first_name,
        "lastName": last_name,
        "createdAt": datetime.utcnow().isoformat(),
        "role": "user",
    })

    custom_token = firebase_auth.create_custom_token(user.uid)
    return {
        "customToken": custom_token.decode("utf-8"),
        "uid": user.uid,
        "email": email,
        "firstName": first_name,
        "lastName": last_name,
    }


def verify_google_token(id_token: str) -> Dict[str, Any]:
    """
    Verify a Google OAuth idToken and ensure a Firestore profile exists.
    Called after signInWithPopup() on the frontend.
    """
    def _verify_google_token_compat(token: str):
        """Verify token across firebase-admin versions."""
        try:
            return firebase_auth.verify_id_token(
                token,
                clock_skew_seconds=FIREBASE_CLOCK_SKEW_SECONDS,
            )
        except TypeError:
            return firebase_auth.verify_id_token(token)

    try:
        for attempt in range(EARLY_TOKEN_MAX_RETRIES + 1):
            try:
                decoded = _verify_google_token_compat(id_token)
                break
            except Exception as exc:
                if "Token used too early" in str(exc) and attempt < EARLY_TOKEN_MAX_RETRIES:
                    time.sleep(EARLY_TOKEN_RETRY_SECONDS)
                    continue
                raise
    except Exception as exc:
        raise HTTPException(status_code=401, detail=f"Invalid Google token: {str(exc)}")

    uid = decoded["uid"]
    db = get_db()
    user_ref = db.collection("users").document(uid)
    doc = user_ref.get()

    if not doc.exists:
        display_name = decoded.get("name", "")
        parts = display_name.split(" ")
        first_name = parts[0] if parts else "User"
        last_name = " ".join(parts[1:]) if len(parts) > 1 else ""
        user_ref.set({
            "email": decoded.get("email", ""),
            "firstName": first_name,
            "lastName": last_name,
            "createdAt": datetime.utcnow().isoformat(),
            "role": "user",
        })
        profile = {"firstName": first_name, "lastName": last_name, "role": "user"}
    else:
        profile = doc.to_dict()

    return {"uid": uid, "profile": profile}


def update_profile(uid: str, updates: Dict[str, Any]) -> Dict[str, Any]:
    """Apply a partial update to the user's Firestore profile."""
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    db = get_db()
    db.collection("users").document(uid).update(updates)
    return {"success": True, "updated": updates}


def change_password(uid: str, new_password: str) -> None:
    """Update the user's password in Firebase Auth."""
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
    try:
        firebase_auth.update_user(uid, password=new_password)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to update password: {str(exc)}")


def delete_account(uid: str) -> None:
    """Delete Firestore profile and Firebase Auth account."""
    db = get_db()
    db.collection("users").document(uid).delete()
    firebase_auth.delete_user(uid)
