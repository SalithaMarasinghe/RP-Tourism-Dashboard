"""
search_service.py
~~~~~~~~~~~~~~~~~
Web search using Google Search via Serper (serper.dev).
Falls back to DuckDuckGo silently if SERPER_API_KEY is not set.

Response contract (always):
    {"success": bool, "results": [{"title", "link", "snippet"}, ...], "query": str}
"""
import logging
import os
from typing import Any, Dict, List

import requests

logger = logging.getLogger(__name__)

_SERPER_URL = "https://google.serper.dev/search"
_DUCKDUCKGO_URL = "https://api.duckduckgo.com/"


# ── Public API ────────────────────────────────────────────────────────────────

def web_search(query: str, num_results: int = 5) -> Dict[str, Any]:
    """
    Search the web for *query*.

    Uses Serper (real Google results) when SERPER_API_KEY is configured,
    otherwise falls back to DuckDuckGo.

    Args:
        query:       The search query string.
        num_results: Max organic results to return (Serper only).

    Returns:
        {"success": bool, "results": [...], "query": str}
    """
    try:
        api_key = os.getenv("SERPER_API_KEY")
        if api_key:
            results = _serper(query, api_key, num_results)
        else:
            logger.warning("SERPER_API_KEY not set — falling back to DuckDuckGo")
            results = _duckduckgo(query)

        return {"success": True, "results": results, "query": query}

    except Exception as exc:
        logger.error("Web search error: %s", exc)
        return {"success": False, "results": [], "query": query, "error": str(exc)}


# ── Serper (Google) ───────────────────────────────────────────────────────────

def _serper(query: str, api_key: str, num: int) -> List[Dict]:
    """Call Serper and return normalised organic results."""
    response = requests.post(
        _SERPER_URL,
        headers={
            "X-API-KEY": api_key,
            "Content-Type": "application/json",
        },
        json={
            "q": query,
            "num": num,
            "gl": "lk",   # geo-locate to Sri Lanka for relevant results
            "hl": "en",
        },
        timeout=8,
    )
    response.raise_for_status()
    data = response.json()

    results: List[Dict] = []

    # Answer box (quick direct answer — highest value)
    if data.get("answerBox"):
        ab = data["answerBox"]
        answer_text = ab.get("answer") or ab.get("snippet") or ""
        if answer_text:
            results.append({
                "title": ab.get("title", "Direct Answer"),
                "link": ab.get("link", ""),
                "snippet": answer_text[:400],
            })

    # Organic results
    for item in data.get("organic", []):
        results.append({
            "title": item.get("title", ""),
            "link": item.get("link", ""),
            "snippet": item.get("snippet", "")[:400],
        })
        if len(results) >= num:
            break

    return results


# ── DuckDuckGo fallback ───────────────────────────────────────────────────────

def _duckduckgo(query: str) -> List[Dict]:
    """DuckDuckGo Instant Answer fallback (no API key required)."""
    results: List[Dict] = []
    try:
        response = requests.get(
            _DUCKDUCKGO_URL,
            params={"q": query, "format": "json", "pretty": 1},
            timeout=5,
        )
        if response.status_code != 200:
            return results

        data = response.json()

        if data.get("Abstract") and len(data.get("Abstract", "")) > 30:
            results.append({
                "title": data.get("Heading", "Search Result"),
                "link": data.get("AbstractURL", ""),
                "snippet": data.get("Abstract", "")[:400],
            })

        for topic in data.get("RelatedTopics", [])[:3]:
            if isinstance(topic, dict) and topic.get("Text"):
                parts = topic["Text"].split(" - ")
                results.append({
                    "title": parts[0],
                    "snippet": parts[1] if len(parts) > 1 else parts[0],
                    "link": topic.get("FirstURL", ""),
                })
    except Exception as exc:
        logger.warning("DuckDuckGo fallback failed: %s", exc)

    return results
