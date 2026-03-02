"""
search_router.py
~~~~~~~~~~~~~~~~
FastAPI router for web search.
Search logic lives in services.search_service.
"""
import logging

from fastapi import APIRouter
from pydantic import BaseModel
from services.search_service import web_search

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/search", tags=["search"])


class SearchQuery(BaseModel):
    query: str


@router.post("/web")
async def web_search_endpoint(body: SearchQuery):
    """Search DuckDuckGo (with Wikipedia fallback) for tourism information."""
    return web_search(body.query)
