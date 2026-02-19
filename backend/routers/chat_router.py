from fastapi import APIRouter, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, List
import firebase_admin
from firebase_admin import auth as firebase_auth, firestore
from datetime import datetime, timezone

router = APIRouter(prefix="/api/chat", tags=["chat"])
security = HTTPBearer()


# ---------- Models ----------

class CreateChatRequest(BaseModel):
    title: str


class SaveMessageRequest(BaseModel):
    role: str          # "user" or "assistant"
    content: str
    sources: Optional[List[str]] = []


class RenameChatRequest(BaseModel):
    title: str


# ---------- Helpers ----------

def get_db():
    return firestore.client()


async def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)) -> dict:
    """Verify Firebase ID token and return decoded payload."""
    try:
        return firebase_auth.verify_id_token(credentials.credentials)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")


def now_iso():
    return datetime.now(timezone.utc).isoformat()


# ---------- Endpoints ----------

@router.post("/create")
async def create_chat(
    body: CreateChatRequest,
    credentials: HTTPAuthorizationCredentials = Security(security)
):
    """Create a new chat document under users/{uid}/chats."""
    decoded = await verify_token(credentials)
    uid = decoded["uid"]

    db = get_db()

    # Ensure user doc exists (for users who might not have a profile yet)
    user_ref = db.collection("users").document(uid)
    if not user_ref.get().exists:
        user_ref.set({"email": decoded.get("email", "")}, merge=True)

    # Create the chat
    now = now_iso()
    chat_ref = db.collection("users").document(uid).collection("chats").document()
    chat_ref.set({
        "title": body.title,
        "createdAt": now,
        "updatedAt": now
    })

    return {"chatId": chat_ref.id, "title": body.title, "createdAt": now, "updatedAt": now}


@router.get("/list")
async def list_chats(credentials: HTTPAuthorizationCredentials = Security(security)):
    """List all chats for the authenticated user, ordered by most recent."""
    decoded = await verify_token(credentials)
    uid = decoded["uid"]

    db = get_db()
    chats_ref = (
        db.collection("users").document(uid).collection("chats")
        .order_by("updatedAt", direction=firestore.Query.DESCENDING)
    )
    docs = chats_ref.stream()

    chats = []
    for doc in docs:
        data = doc.to_dict()
        chats.append({
            "id": doc.id,
            "title": data.get("title", "Untitled"),
            "createdAt": data.get("createdAt"),
            "updatedAt": data.get("updatedAt")
        })

    return {"chats": chats}


@router.get("/{chat_id}")
async def get_chat_messages(
    chat_id: str,
    credentials: HTTPAuthorizationCredentials = Security(security)
):
    """Get all messages for a specific chat, ordered by timestamp."""
    decoded = await verify_token(credentials)
    uid = decoded["uid"]

    db = get_db()
    messages_ref = (
        db.collection("users").document(uid)
        .collection("chats").document(chat_id)
        .collection("messages")
        .order_by("timestamp")
    )
    docs = messages_ref.stream()

    messages = []
    for doc in docs:
        data = doc.to_dict()
        messages.append({
            "id": doc.id,
            "role": data.get("role"),
            "content": data.get("content"),
            "timestamp": data.get("timestamp"),
            "sources": data.get("sources", [])
        })

    return {"chatId": chat_id, "messages": messages}


@router.post("/{chat_id}/message")
async def save_message(
    chat_id: str,
    body: SaveMessageRequest,
    credentials: HTTPAuthorizationCredentials = Security(security)
):
    """Save a message to a chat and update the chat's updatedAt timestamp."""
    decoded = await verify_token(credentials)
    uid = decoded["uid"]

    db = get_db()
    now = now_iso()

    # Save message
    msg_ref = (
        db.collection("users").document(uid)
        .collection("chats").document(chat_id)
        .collection("messages").document()
    )
    msg_ref.set({
        "role": body.role,
        "content": body.content,
        "sources": body.sources or [],
        "timestamp": now
    })

    # Update chat updatedAt
    db.collection("users").document(uid).collection("chats").document(chat_id).update({
        "updatedAt": now
    })

    return {"messageId": msg_ref.id, "timestamp": now}


@router.put("/{chat_id}/rename")
async def rename_chat(
    chat_id: str,
    body: RenameChatRequest,
    credentials: HTTPAuthorizationCredentials = Security(security)
):
    """Rename a chat."""
    decoded = await verify_token(credentials)
    uid = decoded["uid"]

    db = get_db()
    db.collection("users").document(uid).collection("chats").document(chat_id).update({
        "title": body.title
    })

    return {"success": True, "chatId": chat_id, "title": body.title}


@router.delete("/{chat_id}")
async def delete_chat(
    chat_id: str,
    credentials: HTTPAuthorizationCredentials = Security(security)
):
    """Delete a chat and all its messages."""
    decoded = await verify_token(credentials)
    uid = decoded["uid"]

    db = get_db()
    chat_ref = (
        db.collection("users").document(uid)
        .collection("chats").document(chat_id)
    )

    # Delete all messages in the subcollection first
    messages_ref = chat_ref.collection("messages")
    for msg_doc in messages_ref.stream():
        msg_doc.reference.delete()

    # Delete the chat document
    chat_ref.delete()

    return {"success": True, "chatId": chat_id}
