"""
chat_router.py
~~~~~~~~~~~~~~
FastAPI router for the chat module.
All business logic lives in services.chat_service — handlers are thin.
"""
import logging

from fastapi import APIRouter, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from auth import verify_token
from models.chat_models import (
    ChatRequest,
    CreateChatRequest,
    RenameChatRequest,
    SaveMessageRequest,
)
from services import chat_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["chat"])
security = HTTPBearer()


# ---------- Endpoints ----------

@router.post("/create")
async def create_chat(
    body: CreateChatRequest,
    credentials: HTTPAuthorizationCredentials = Security(security),
):
    """Create a new chat document."""
    decoded = await verify_token(credentials)
    return chat_service.create_chat(decoded["uid"], body.title)


@router.get("/list")
async def list_chats(
    credentials: HTTPAuthorizationCredentials = Security(security),
):
    """List all chats for the authenticated user, most-recent first."""
    decoded = await verify_token(credentials)
    return {"chats": chat_service.list_chats(decoded["uid"])}


@router.get("/{chat_id}")
async def get_chat_messages(
    chat_id: str,
    credentials: HTTPAuthorizationCredentials = Security(security),
):
    """Get all messages for a specific chat."""
    decoded = await verify_token(credentials)
    messages = chat_service.get_chat_messages(decoded["uid"], chat_id)
    return {"chatId": chat_id, "messages": messages}


@router.post("/{chat_id}/message")
async def save_message(
    chat_id: str,
    body: SaveMessageRequest,
    credentials: HTTPAuthorizationCredentials = Security(security),
):
    """Save a message to a chat."""
    decoded = await verify_token(credentials)
    return chat_service.save_message(
        decoded["uid"], chat_id, body.role, body.content, body.sources
    )


@router.post("/ask")
async def chat_with_ai(
    body: ChatRequest,
    credentials: HTTPAuthorizationCredentials = Security(security),
):
    """Chat with the AI assistant using Gemini."""
    decoded = await verify_token(credentials)
    return await chat_service.handle_ask(decoded["uid"], body.message, body.chat_id)


@router.put("/{chat_id}/rename")
async def rename_chat(
    chat_id: str,
    body: RenameChatRequest,
    credentials: HTTPAuthorizationCredentials = Security(security),
):
    """Rename a chat."""
    decoded = await verify_token(credentials)
    chat_service.rename_chat(decoded["uid"], chat_id, body.title)
    return {"success": True, "chatId": chat_id, "title": body.title}


@router.delete("/{chat_id}")
async def delete_chat(
    chat_id: str,
    credentials: HTTPAuthorizationCredentials = Security(security),
):
    """Delete a chat and all its messages."""
    decoded = await verify_token(credentials)
    chat_service.delete_chat(decoded["uid"], chat_id)
    return {"success": True, "chatId": chat_id}
