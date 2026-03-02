"""
core_router.py
~~~~~~~~~~~~~~
Utility / health-check endpoints.
  GET  /api/         — root
  GET  /api/test     — CORS probe
  POST /api/status   — create a status check (authenticated)
  GET  /api/status   — list status checks
"""
import uuid
from datetime import datetime
from typing import List

from fastapi import APIRouter, Security
from pydantic import BaseModel, Field

from auth import get_current_user

router = APIRouter(prefix="/api", tags=["core"])

# In-memory store (same behaviour as before)
_status_checks: list = []


# ---------- Models ----------

class StatusCheckCreate(BaseModel):
    client_name: str


class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# ---------- Endpoints ----------

@router.get("/")
async def root():
    return {"message": "Hello World"}


@router.get("/test")
async def test_endpoint():
    return {"message": "CORS is working!"}


@router.post("/status", response_model=StatusCheck)
async def create_status_check(
    input: StatusCheckCreate,
    user: dict = Security(get_current_user),
):
    status_obj = StatusCheck(**input.dict())
    _status_checks.append(status_obj.dict())
    return status_obj


@router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    return [StatusCheck(**s) for s in _status_checks]
