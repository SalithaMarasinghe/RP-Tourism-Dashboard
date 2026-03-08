import os
import json
import logging
import asyncio
import firebase_admin
from firebase_admin import credentials, auth
from fastapi import HTTPException, Security, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from functools import lru_cache
from dotenv import load_dotenv

# Set up logger
logger = logging.getLogger(__name__)

load_dotenv()

# Allow small client/server clock drift to avoid false "Token used too early" failures.
FIREBASE_CLOCK_SKEW_SECONDS = int(os.getenv("FIREBASE_CLOCK_SKEW_SECONDS", "60"))

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
        logger.debug("Firebase Admin initialized from FIREBASE_SERVICE_ACCOUNT_JSON.")
    except (json.JSONDecodeError, ValueError) as e:
        logger.error(f"Error parsing FIREBASE_SERVICE_ACCOUNT_JSON: {e}")
elif os.path.exists(cred_path):
    try:
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
        logger.debug("Firebase Admin initialized from file.")
    except ValueError:
        # App already initialized
        pass
else:
    logger.warning(f"Firebase credentials not found. Set FIREBASE_SERVICE_ACCOUNT_JSON or provide {cred_path}.")

security = HTTPBearer()


def _verify_id_token_compat(token: str):
    """
    Verify Firebase ID token across firebase-admin versions.
    Older versions do not support `clock_skew_seconds`.
    """
    try:
        return auth.verify_id_token(
            token,
            clock_skew_seconds=FIREBASE_CLOCK_SKEW_SECONDS,
        )
    except TypeError:
        # Backward compatibility for older firebase-admin versions.
        return auth.verify_id_token(token)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)):
    """
    Verifies the Firebase token and returns the user's decoded token data.
    """
    token = credentials.credentials
    try:
        try:
            return _verify_id_token_compat(token)
        except Exception as first_error:
            # If token is marginally early due to clock drift, retry once after 1s.
            if "Token used too early" in str(first_error):
                await asyncio.sleep(1)
                return _verify_id_token_compat(token)
            raise
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
        token = credentials.credentials
        try:
            return _verify_id_token_compat(token)
        except Exception as first_error:
            if "Token used too early" in str(first_error):
                await asyncio.sleep(1)
                return _verify_id_token_compat(token)
            raise
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail=f"Invalid token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
