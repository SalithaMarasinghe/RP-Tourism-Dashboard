"""
chat_service.py
~~~~~~~~~~~~~~~
All business logic for the chat module:
  - Firestore CRUD (chats and messages)
  - AI context gathering (loopback-free — imports services directly)
  - Gemini API call

No FastAPI / HTTP concerns live here.
"""
import logging
import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import HTTPException
from firebase_admin import auth as firebase_auth, firestore
import google.generativeai as genai

from services.forecast_service import get_daily_forecasts, get_scenarios, get_upcoming_forecast_context
from services.search_service import web_search

logger = logging.getLogger(__name__)


# ── Utilities ────────────────────────────────────────────────────────────────

def get_db():
    """Return a Firestore client."""
    return firestore.client()


def now_iso() -> str:
    """Return the current UTC time as an ISO 8601 string."""
    return datetime.now(timezone.utc).isoformat()


# ── Firestore CRUD ───────────────────────────────────────────────────────────

def create_chat(uid: str, title: str) -> Dict[str, Any]:
    """Create a new chat document under users/{uid}/chats and return its data."""
    db = get_db()

    # Ensure the user document exists
    user_ref = db.collection("users").document(uid)
    if not user_ref.get().exists:
        user_ref.set({"uid": uid}, merge=True)

    now = now_iso()
    chat_ref = db.collection("users").document(uid).collection("chats").document()
    chat_ref.set({"title": title, "createdAt": now, "updatedAt": now})

    return {"chatId": chat_ref.id, "title": title, "createdAt": now, "updatedAt": now}


def list_chats(uid: str) -> List[Dict[str, Any]]:
    """Return all chats for *uid*, ordered most-recent first."""
    db = get_db()
    docs = (
        db.collection("users").document(uid).collection("chats")
        .order_by("updatedAt", direction=firestore.Query.DESCENDING)
        .stream()
    )
    return [
        {
            "id": doc.id,
            "title": doc.to_dict().get("title", "Untitled"),
            "createdAt": doc.to_dict().get("createdAt"),
            "updatedAt": doc.to_dict().get("updatedAt"),
        }
        for doc in docs
    ]


def get_chat_messages(uid: str, chat_id: str) -> List[Dict[str, Any]]:
    """Return all messages for a chat, ordered by timestamp ascending."""
    db = get_db()
    docs = (
        db.collection("users").document(uid)
        .collection("chats").document(chat_id)
        .collection("messages")
        .order_by("timestamp")
        .stream()
    )
    return [
        {
            "id": doc.id,
            "role": doc.to_dict().get("role"),
            "content": doc.to_dict().get("content"),
            "timestamp": doc.to_dict().get("timestamp"),
            "sources": doc.to_dict().get("sources", []),
        }
        for doc in docs
    ]


def save_message(
    uid: str,
    chat_id: str,
    role: str,
    content: str,
    sources: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """Persist a single message and bump the chat's updatedAt timestamp."""
    db = get_db()
    now = now_iso()

    msg_ref = (
        db.collection("users").document(uid)
        .collection("chats").document(chat_id)
        .collection("messages").document()
    )
    msg_ref.set({"role": role, "content": content, "sources": sources or [], "timestamp": now})

    db.collection("users").document(uid).collection("chats").document(chat_id).update({
        "updatedAt": now
    })

    return {"messageId": msg_ref.id, "timestamp": now}


def rename_chat(uid: str, chat_id: str, title: str) -> None:
    """Update the title of a chat document."""
    db = get_db()
    db.collection("users").document(uid).collection("chats").document(chat_id).update({
        "title": title
    })


def delete_chat(uid: str, chat_id: str) -> None:
    """Delete a chat document and all its messages."""
    db = get_db()
    chat_ref = (
        db.collection("users").document(uid)
        .collection("chats").document(chat_id)
    )
    for msg_doc in chat_ref.collection("messages").stream():
        msg_doc.reference.delete()
    chat_ref.delete()


# ── AI Context Gathering ─────────────────────────────────────────────────────

async def gather_context(message: str) -> Dict[str, str]:
    """
    Collect context from multiple data sources for the AI prompt.

    Calls service modules directly — no HTTP loopback.
    """
    context: Dict[str, str] = {
        "web_search": "",
        "tdms_data": "",
        "forecasts": "",
        "daily_predictions": "",
    }

    # 1. Web search
    try:
        result = web_search(message)
        if result.get("success") and result.get("results"):
            context["web_search"] = "\n\nRecent web search results:\n" + "\n".join(
                f"- {r['title']}: {r['snippet']}" for r in result["results"][:3]
            )
    except Exception as exc:
        logger.warning("Web search failed: %s", exc)

    # 2. Forecast scenarios (direct import — no HTTP)
    try:
        # Get actual upcoming numeric forecast data (next 3 months)
        forecast_text = get_upcoming_forecast_context(3)
        if forecast_text != "No baseline forecast data available.":
            context["forecasts"] = f"\n\n{forecast_text}"
    except Exception as exc:
        logger.warning("Forecast scenarios fetch failed: %s", exc)

    # 3. Daily predictions (direct import — no HTTP)
    try:
        daily = get_daily_forecasts()
        baseline_daily = daily.get("baseline", [])
        if baseline_daily:
            context["daily_predictions"] = "\n\nDaily Predictions: Short-term forecasts available in system."
    except Exception as exc:
        logger.warning("Daily predictions fetch failed: %s", exc)

    return context


# ── Gemini API ───────────────────────────────────────────────────────────────

async def call_gemini_api(message: str, context: Dict[str, str]) -> Dict[str, Any]:
    """
    Build a prompt from *message* + *context* and call the Gemini API.

    Returns:
        {"text": str, "sources": list[str]}
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Gemini API key not configured")

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-2.5-flash")

    # Construct intelligent system prompt with context engineering
    prompt = f"""You are an AI assistant specialising in Sri Lanka tourism analytics and insights. \
You have access to real-time data and comprehensive tourism information.

Context Data:
{context.get('web_search', '')}
{context.get('tdms_data', '')}
{context.get('forecasts', '')}
{context.get('daily_predictions', '')}

User Question: {message}

Please provide a helpful, accurate response based on the available context and your knowledge.

CRITICAL INSTRUCTION FOR FORECAST ADJUSTMENTS:
When the user asks to predict the impact of an event or news (like a regional conflict, economic crisis, or viral trend) on upcoming Sri Lanka tourism, you MUST:
1. Start with the provided baseline numerical forecasts from the Context Data (e.g. March: 290k).
2. Analyze the sentiment and severity of the provided web search context regarding the event.
3. Explicitly state a quantitative reasoning multiplier (e.g., "Given the European flight cancellations, I estimate a 12% drop").
4. Output the final *Adjusted Forecasts* by mathematically applying your multiplier to the baseline numbers.
DO NOT provide vague qualitative answers without numbers if you have baseline data available.

Focus on:
- Data-driven mathematical insights
- Current tourism trends and information
- Practical advice for tourism stakeholders
- Specific Sri Lanka tourism context

Format your response in a clear, readable manner with appropriate use of markdown formatting."""

    try:
        response = await model.generate_content_async(prompt)
    except Exception as exc:
        logger.error("Gemini API call failed: %s", exc)
        raise HTTPException(status_code=500, detail=f"Gemini API error: {str(exc)}")

    if not (response and response.text):
        raise HTTPException(status_code=500, detail="No response generated from Gemini API")

    sources = [
        label
        for label, key in [
            ("Web search integration", "web_search"),
            ("TDMS dataset", "tdms_data"),
            ("Forecast scenarios", "forecasts"),
            ("Daily predictions", "daily_predictions"),
        ]
        if context.get(key)
    ]

    return {"text": response.text, "sources": sources}


# ── Orchestrated ask flow ────────────────────────────────────────────────────

async def handle_ask(uid: str, message: str, chat_id: Optional[str]) -> Dict[str, Any]:
    """
    Full ask flow: gather context → call Gemini → persist messages → return response.
    """
    context = await gather_context(message)
    gemini_response = await call_gemini_api(message, context)

    # Create a new chat if none provided
    if not chat_id:
        title = message[:60] if len(message) > 60 else message
        chat_data = create_chat(uid, title)
        chat_id = chat_data["chatId"]

    now = now_iso()
    db = get_db()
    uid_ref = db.collection("users").document(uid)

    # Save user message
    uid_ref.collection("chats").document(chat_id).collection("messages").document().set({
        "role": "user", "content": message, "sources": [], "timestamp": now
    })

    # Save AI response
    uid_ref.collection("chats").document(chat_id).collection("messages").document().set({
        "role": "assistant",
        "content": gemini_response["text"],
        "sources": gemini_response["sources"],
        "timestamp": now_iso(),
    })

    # Update chat timestamp
    uid_ref.collection("chats").document(chat_id).update({"updatedAt": now_iso()})

    return {
        "response": gemini_response["text"],
        "sources": gemini_response["sources"],
        "chat_id": chat_id,
    }
