import os
import firebase_admin
from firebase_admin import credentials, auth
from fastapi import HTTPException, Security, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from functools import lru_cache
from dotenv import load_dotenv

load_dotenv()

# Initialize Firebase Admin
# Expects serviceAccountKey.json in the same directory or specified via env var
cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "serviceAccountKey.json")

if not os.path.exists(cred_path):
    print(f"Warning: {cred_path} not found. Firebase Admin not initialized.")
else:
    try:
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
        print("Firebase Admin initialized successfully.")
    except ValueError:
        # App already initialized
        pass

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)):
    """
    Verifies the Firebase token and returns the user's decoded token data.
    """
    token = credentials.credentials
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail=f"Invalid authentication credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)) -> dict:
    """
    Shared token verification helper for use across all routers.
    Verifies the Firebase ID token and returns the decoded payload.
    """
    try:
        return auth.verify_id_token(credentials.credentials)
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail=f"Invalid token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
