"""
rag_router.py
~~~~~~~~~~~~~
FastAPI router for RAG-based Tourism Data Assistant.
Separate from existing Gemini chatbot logic.
"""
import logging

from fastapi import APIRouter, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from auth import verify_token
from models.chat_models import ChatRequest
from services import tourism_rag

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/rag", tags=["rag"])
security = HTTPBearer()

@router.post("/chat")
async def rag_chat(
    body: ChatRequest,
    credentials: HTTPAuthorizationCredentials = Security(security),
):
    """Chat with the Tourism Data Assistant using RAG."""
    decoded = await verify_token(credentials)
    
    try:
        # NEW: Pass both message and history to the RAG engine
        result = await tourism_rag.handle_tourism_rag_query(body.message, body.history)
        return {
            "response": result["response"],
            "sources": result["sources"],
            "chunks_used": result["chunks_used"],
            "context_available": result["context_available"]
        }
    except Exception as e:
        logger.error(f"RAG chat error: {e}")
        raise

@router.get("/status")
async def rag_status(
    credentials: HTTPAuthorizationCredentials = Security(security),
):
    """Check RAG system status."""
    decoded = await verify_token(credentials)
    
    try:
        if tourism_rag._embedding_model is None:
            return {"status": "not_initialized", "message": "RAG system not loaded"}
        
        return {
            "status": "ready",
            "message": "RAG system initialized and ready",
            "embedding_model": "all-MiniLM-L6-v2 (ONNX)",
            "vector_db": "Chroma",
            "keyword_index": "BM25"
        }
    except Exception as e:
        logger.error(f"RAG status check error: {e}")
        return {"status": "error", "message": str(e)}