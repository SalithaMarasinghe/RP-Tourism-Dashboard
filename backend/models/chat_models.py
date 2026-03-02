"""
chat_models.py
~~~~~~~~~~~~~~
Pydantic request/response models for the chat module.
"""
from typing import List, Optional

from pydantic import BaseModel


# ---------- Request models ----------

class CreateChatRequest(BaseModel):
    title: str


class SaveMessageRequest(BaseModel):
    role: str               # "user" or "assistant"
    content: str
    sources: Optional[List[str]] = []


class RenameChatRequest(BaseModel):
    title: str


class ChatRequest(BaseModel):
    message: str
    chat_id: Optional[str] = None


# ---------- Response models ----------

class ChatMessage(BaseModel):
    id: str
    role: str
    content: str
    timestamp: Optional[str] = None
    sources: List[str] = []


class ChatListItem(BaseModel):
    id: str
    title: str
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None
