"""
auth_models.py
~~~~~~~~~~~~~~
Pydantic request models for the auth module.
"""
from typing import Optional

from pydantic import BaseModel, EmailStr


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


class PasswordChangeRequest(BaseModel):
    currentPassword: str
    newPassword: str
