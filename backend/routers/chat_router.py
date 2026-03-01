from fastapi import APIRouter, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, List
import firebase_admin
from firebase_admin import auth as firebase_auth, firestore
from datetime import datetime, timezone
import os
import requests
import google.generativeai as genai
from pathlib import Path

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


class ChatRequest(BaseModel):
    message: str
    chat_id: Optional[str] = None


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


# ---------- Gemini Helpers ----------

def get_root_dir():
    return Path(__file__).parent.parent

async def gather_context(message: str) -> dict:
    """Gather context from multiple sources for the AI."""
    context = {
        "web_search": "",
        "tdms_data": "",
        "forecasts": "",
        "daily_predictions": ""
    }
    
    try:
        # 1. Web search for current information
        search_response = requests.post(
            f"http://localhost:8000/api/search/web",
            json={"query": message},
            timeout=10
        )
        if search_response.status_code == 200:
            search_data = search_response.json()
            if search_data.get("success") and search_data.get("results"):
                context["web_search"] = "\n\nRecent web search results:\n" + \
                    "\n".join([f"- {r['title']}: {r['snippet']}" for r in search_data["results"][:3]])
    except Exception as e:
        print(f"Web search failed: {e}")
    
    try:
        # 2. Get forecast scenarios
        scenarios_response = requests.get("http://localhost:8000/api/forecasts/scenarios", timeout=5)
        if scenarios_response.status_code == 200:
            scenarios_data = scenarios_response.json()
            if scenarios_data.get("baseline") and len(scenarios_data["baseline"]) > 0:
                context["forecasts"] = "\n\nForecast Scenarios Data:\n" + \
                    f"Baseline scenario available with {len(scenarios_data['baseline'])} data points"
    except Exception as e:
        print(f"Forecasts fetch failed: {e}")
    
    try:
        # 3. Get TDMS data
        sites_response = requests.get("http://localhost:8000/api/tdms/sites", timeout=5)
        if sites_response.status_code == 200:
            sites_data = sites_response.json()
            if sites_data.get("sites"):
                context["tdms_data"] = f"\n\nTDMS Data: Available sites include {', '.join(sites_data['sites'][:5])}"
    except Exception as e:
        print(f"TDMS fetch failed: {e}")
    
    try:
        # 4. Get daily predictions
        daily_response = requests.get("http://localhost:8000/api/forecasts/daily", timeout=5)
        if daily_response.status_code == 200:
            daily_data = daily_response.json()
            if daily_data.get("baseline") and len(daily_data["baseline"]) > 0:
                context["daily_predictions"] = "\n\nDaily Predictions: Short-term forecasts available"
    except Exception as e:
        print(f"Daily predictions fetch failed: {e}")
    
    return context


async def call_gemini_api(message: str, context: dict) -> dict:
    """Call Gemini API with message and context."""
    try:
        # Configure Gemini API
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="Gemini API key not configured")
        
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        # Build prompt with context
        prompt = f"""You are an AI assistant specializing in Sri Lanka tourism analytics and insights. You have access to real-time data and comprehensive tourism information.

Context Data:
{context.get('web_search', '')}
{context.get('tdms_data', '')}
{context.get('forecasts', '')}
{context.get('daily_predictions', '')}

User Question: {message}

Please provide a helpful, accurate response based on the available context and your knowledge. If specific data isn't available, clearly state that and provide general guidance based on tourism best practices.

Focus on:
- Data-driven insights when available
- Current tourism trends and information
- Practical advice for tourism stakeholders
- Specific Sri Lanka tourism context

Format your response in a clear, readable manner with appropriate use of markdown formatting."""
        
        response = await model.generate_content_async(prompt)
        
        if response and response.text:
            # Determine sources used
            sources = []
            if context.get("web_search"):
                sources.append("Web search integration")
            if context.get("tdms_data"):
                sources.append("TDMS dataset")
            if context.get("forecasts"):
                sources.append("Forecast scenarios")
            if context.get("daily_predictions"):
                sources.append("Daily predictions")
            
            return {
                "text": response.text,
                "sources": sources
            }
        else:
            raise HTTPException(status_code=500, detail="No response generated from Gemini API")
            
    except Exception as e:
        print(f"Gemini API call failed: {e}")
        raise HTTPException(status_code=500, detail=f"Gemini API error: {str(e)}")


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


@router.post("/ask")
async def chat_with_ai(
    body: ChatRequest,
    credentials: HTTPAuthorizationCredentials = Security(security)
):
    """Chat with AI assistant using Gemini."""
    decoded = await verify_token(credentials)
    uid = decoded["uid"]
    
    try:
        # Gather context from multiple sources
        context = await gather_context(body.message)
        
        # Call Gemini API
        gemini_response = await call_gemini_api(body.message, context)
        
        # Handle chat creation/message saving
        chat_id = body.chat_id
        if not chat_id:
            # Create new chat
            title = body.message[:60] if len(body.message) > 60 else body.message
            db = get_db()
            
            # Ensure user doc exists
            user_ref = db.collection("users").document(uid)
            if not user_ref.get().exists:
                user_ref.set({"email": decoded.get("email", "")}, merge=True)
            
            # Create chat
            now = now_iso()
            chat_ref = db.collection("users").document(uid).collection("chats").document()
            chat_ref.set({
                "title": title,
                "createdAt": now,
                "updatedAt": now
            })
            chat_id = chat_ref.id
        
        # Save user message
        db = get_db()
        now = now_iso()
        user_msg_ref = (
            db.collection("users").document(uid)
            .collection("chats").document(chat_id)
            .collection("messages").document()
        )
        user_msg_ref.set({
            "role": "user",
            "content": body.message,
            "sources": [],
            "timestamp": now
        })
        
        # Save AI response
        ai_msg_ref = (
            db.collection("users").document(uid)
            .collection("chats").document(chat_id)
            .collection("messages").document()
        )
        ai_msg_ref.set({
            "role": "assistant",
            "content": gemini_response["text"],
            "sources": gemini_response["sources"],
            "timestamp": now_iso()
        })
        
        # Update chat timestamp
        db.collection("users").document(uid).collection("chats").document(chat_id).update({
            "updatedAt": now_iso()
        })
        
        return {
            "response": gemini_response["text"],
            "sources": gemini_response["sources"],
            "chat_id": chat_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Chat endpoint error: {e}")
        raise HTTPException(status_code=500, detail=f"Chat processing failed: {str(e)}")


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
