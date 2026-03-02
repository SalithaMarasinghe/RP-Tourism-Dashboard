import os
import json
import firebase_admin
from firebase_admin import credentials, auth
from fastapi import HTTPException, Security, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from functools import lru_cache
from dotenv import load_dotenv

load_dotenv()

# Initialize Firebase Admin
# Supports three methods (in priority order):
# 1. FIREBASE_SERVICE_ACCOUNT_JSON env var (JSON string, for Render/cloud)
# 2. FIREBASE_CREDENTIALS_PATH env var (file path)
# 3. Default serviceAccountKey.json file
cred_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "serviceAccountKey.json")

if cred_json:
    try:
        cred_dict = json.loads(cred_json)
        cred = credentials.Certificate(cred_dict)
        firebase_admin.initialize_app(cred)
        print("Firebase Admin initialized from FIREBASE_SERVICE_ACCOUNT_JSON.")
    except (json.JSONDecodeError, ValueError) as e:
        print(f"Error parsing FIREBASE_SERVICE_ACCOUNT_JSON: {e}")
elif os.path.exists(cred_path):
    try:
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
        print("Firebase Admin initialized from file.")
    except ValueError:
        # App already initialized
        pass
else:
    print(f"Warning: Firebase credentials not found. Set FIREBASE_SERVICE_ACCOUNT_JSON or provide {cred_path}.")

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
