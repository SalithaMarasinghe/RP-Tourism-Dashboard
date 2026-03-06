"""
source_market_geo_service.py
~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Background intelligence pipeline for Source Market Geopolitics.

Pipeline steps:
  1. Google Custom Search (10 queries across 15 domains)
  2. Tavily Real-Time Search (4 queries)
  3. Combine results & inject variables into Prompt B
  4. Groq LLM call with structured JSON parsing
  5. Cache management
"""
import json
import logging
import math
import os
import re
from pathlib import Path
from datetime import datetime, timedelta, timezone

from googleapiclient.discovery import build
from tavily import TavilyClient
from groq import Groq

from models.source_market_geo_models import SourceMarketGeoResponse

logger = logging.getLogger(__name__)

# ── Paths ─────────────────────────────────────────────────────────────────────
_BACKEND_DIR = Path(__file__).parent.parent
_PROMPT_FILE = _BACKEND_DIR / "prompts" / "source_market_geo_agent_prompt.txt"
_CACHE_DIR = _BACKEND_DIR / "cache"
_CACHE_FILE = _CACHE_DIR / "source_market_geo_cache.json"

# ── 15 Authoritative Domains (GCS) ─────────────────────────────────────────────
_ALL_DOMAINS = [
    "www.reuters.com", "www.bbc.com", "apnews.com",
    "www.aljazeera.com", "www.theguardian.com",
    "travel.state.gov", "www.gov.uk", "www.dfat.gov.au",
    "aviationherald.com", "www.flightradar24.com", "www.bloomberg.com",
    "oilprice.com", "www.ft.com", 
    "www.sltda.gov.lk", "www.unwto.org",
]

def now_utc() -> datetime:
    return datetime.now(timezone.utc)

def parse_iso_datetime(dt_string: str) -> datetime:
    return datetime.fromisoformat(dt_string.replace("Z", "+00:00"))


# ── Part A / Part B loader ─────────────────────────────────────────────────────
def load_prompt_parts() -> tuple[str, str]:
    content = _PROMPT_FILE.read_text(encoding="utf-8")

    part_a_marker = "PART A — SYSTEM INSTRUCTION"
    part_b_marker = "PART B — DASHBOARD TASK PROMPT"

    idx_a = content.find(part_a_marker)
    idx_b = content.find(part_b_marker)

    if idx_a == -1 or idx_b == -1:
        raise ValueError(
            "Could not locate PART A / PART B delimiters in the prompt file."
        )

    part_a = content[idx_a: idx_b].strip()
    part_b = content[idx_b:].strip()

    return part_a, part_b


# ── Helper to isolate domain name from GCS source url ─────────────────────────
def _extract_domain(url: str) -> str:
    try:
        return url.split("/")[2]
    except IndexError:
        return "unknown"


# ── Search Executors ──────────────────────────────────────────────────────────
def execute_gcs(current_month: str, current_year: str) -> tuple[str, list, list]:
    api_key = os.getenv("GOOGLE_SEARCH_API_KEY")
    cx = os.getenv("GOOGLE_SEARCH_ENGINE_ID")
    if not (api_key and cx):
        logger.warning("Google Search credentials missing. Skipping GCS layer.")
        return "", [], []
    
    try:
        service = build("customsearch", "v1", developerKey=api_key)
    except Exception as exc:
        logger.error("Failed to build GCS service: %s", exc)
        return "", [], []

    queries = [
        f"India outbound tourism travel {current_month} {current_year}",
        f"Russia UK Germany France outbound travel disruption {current_year}",
        f"China outbound tourism international travel policy {current_year}",
        f"Colombo CMB flight routes airline capacity South Asia {current_year}",
        f"Dubai Doha Singapore airport flight disruption routes {current_month} {current_year}",
        f"Sri Lanka travel advisory warning UK Australia USA {current_month} {current_year}",
        f"India Pakistan Russia Ukraine conflict travel impact {current_year}",
        f"oil price airfare long haul flight cost {current_month} {current_year}",
        f"Bangladesh Poland outbound travel growth tourism {current_year}",
        f"Sri Lanka tourism arrivals visa policy {current_month} {current_year}"
    ]

    all_results = []
    domains_found = set()
    
    for q_idx, query in enumerate(queries, 1):
        try:
            res = service.cse().list(
                q=query,
                cx=cx,
                num=5,
                dateRestrict="m1"
            ).execute()
            
            items = res.get("items", [])
            formatted = []
            seen_urls = set()
            
            for item in items:
                url = item.get("link", "")
                if url not in seen_urls:
                    seen_urls.add(url)
                    domain = _extract_domain(url)
                    if domain in _ALL_DOMAINS:
                        domains_found.add(domain)
                    title = item.get("title", "No Title")
                    snippet = item.get("snippet", "").replace("\n", " ")
                    formatted.append(f"  - [GCS] [{title}] | {domain}\n    {snippet}\n    URL: {url}")
            
            all_results.append(
                f"GCS Query {q_idx}: {query}\n"
                f"Results ({len(formatted)}):\n" +
                ("\n".join(formatted) if formatted else "  No results found.")
            )
        except Exception as e:
            logger.error("GCS search error for query '%s': %s", query, e)
            all_results.append(f"GCS Query {q_idx}: Search failed — {e}")

    domains_no_results = [d for d in _ALL_DOMAINS if d not in domains_found]
    return "\n---\n".join(all_results), list(domains_found), domains_no_results


def execute_tavily(current_month: str, current_year: str) -> tuple[str, int]:
    api_key = os.getenv("TAVILY_API_KEY")
    if not api_key:
        logger.warning("Tavily API Key missing. Skipping real-time search layer.")
        return "", 0

    client = TavilyClient(api_key=api_key)
    
    queries = [
        f"Sri Lanka source markets tourism news {current_month} {current_year}",
        f"India Russia China outbound travel disruption {current_year}",
        f"Colombo airport flight cancellations route changes {current_year}",
        f"geopolitical risk tourism Asia {current_month} {current_year}",
    ]

    all_results = []
    total_results_count = 0

    for q_idx, query in enumerate(queries, 1):
        try:
            response = client.search(
                query=query,
                search_depth="advanced",
                max_results=5,
                include_answer=False,
                include_raw_content=False,
                days=30
            )
            results = response.get("results", [])
            formatted = []
            seen_urls = set()
            
            for r in results:
                url = r.get("url", "")
                if url not in seen_urls:
                    seen_urls.add(url)
                    total_results_count += 1
                    domain = _extract_domain(url)
                    title = r.get('title', 'No Title')
                    date = r.get('published_date', 'N/A')
                    content = r.get('content', '')[:300].replace('\n', ' ')
                    formatted.append(f"  - [TAVILY] [{title}] | {domain} | {date}\n    {content}\n    URL: {url}")

            all_results.append(
                f"Tavily Query {q_idx}: {query}\n"
                f"Results ({len(formatted)}):\n" +
                ("\n".join(formatted) if formatted else "  No results found.")
            )
        except Exception as e:
            logger.error("Tavily search error for query '%s': %s", query, e)
            all_results.append(f"Tavily Query {q_idx}: Search failed — {e}")

    return "\n---\n".join(all_results), total_results_count


def gather_search_context(current_month: str, current_year: str) -> str:
    gcs_block, gcs_found, gcs_missing = execute_gcs(current_month, current_year)
    tavily_block, tavily_count = execute_tavily(current_month, current_year)

    return (
        "SEARCH RESULTS CONTEXT (use this as your sole geopolitical intelligence source):\n"
        "---\n"
        f"{gcs_block}\n"
        "---\n"
        f"{tavily_block}\n"
        "---\n"
    )


# ── Variable injection ─────────────────────────────────────────────────────────
def inject_variables(
    part_b: str,
    current_date: str,
    current_time: str,
    current_month: str,
    current_year: str,
    trigger_type: str,
    day_of_week: str,
    search_context: str
) -> str:
    substitutions = {
        "{{ CURRENT_DATE }}": current_date,
        "{{ CURRENT_TIME }}": current_time,
        "{{ CURRENT_MONTH }}": current_month,
        "{{ CURRENT_YEAR }}": current_year,
        "{{ TRIGGER_TYPE }}": trigger_type,
        "{{ DAY_OF_WEEK }}": day_of_week,
        "{SEARCH_RESULTS_PLACEHOLDER}": search_context,
    }

    result = part_b
    for placeholder, value in substitutions.items():
        result = result.replace(placeholder, value)

    remaining = re.findall(r"\{\{.*?\}\}", result)
    if remaining:
        raise ValueError(f"Variable injection incomplete — remaining: {remaining}")

    return result


# ── Caching Logic Helpers ──────────────────────────────────────────────────────
def compute_expires_at(cached_at_iso: str, overall_risk_level: str) -> str:
    cached_at = parse_iso_datetime(cached_at_iso)
    if overall_risk_level == "CRITICAL":
        expires = cached_at + timedelta(hours=48)
    else:
        expires = cached_at + timedelta(days=7)
    return expires.isoformat()


# ── LLM Pipeline ───────────────────────────────────────────────────────────────
def run_pipeline(
    current_date: str,
    current_time: str,
    current_month: str,
    current_year: str,
    trigger_type: str,
    day_of_week: str,
) -> SourceMarketGeoResponse:
    
    search_context = gather_search_context(current_month, current_year)

    part_a, part_b = load_prompt_parts()
    injected_part_b = inject_variables(
        part_b,
        current_date, current_time, current_month, current_year,
        trigger_type, day_of_week, search_context
    )

    full_user_turn = injected_part_b

    api_key = os.getenv("GROQ_API_KEY") or os.getenv("GEMINI_GEOPOLITICAL_API_KEY")
    client = Groq(api_key=api_key)

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": part_a},
            {"role": "user", "content": full_user_turn}
        ],
        temperature=0.1,
    )
    
    raw_text = response.choices[0].message.content
    cleaned = raw_text.strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.MULTILINE)
    cleaned = re.sub(r"\s*```$", "", cleaned, flags=re.MULTILINE)
    cleaned = cleaned.strip()

    try:
        result = SourceMarketGeoResponse.model_validate_json(cleaned)
    except Exception as exc:
        raise ValueError(
            f"JSON response failed Pydantic validation.\n"
            f"Error: {exc}\nRaw response:\n{raw_text}"
        ) from exc
        
    return result


# ── Cache read / write ─────────────────────────────────────────────────────────
def write_cache(data: SourceMarketGeoResponse) -> None:
    _CACHE_DIR.mkdir(parents=True, exist_ok=True)
    try:
        with open(_CACHE_FILE, "w", encoding="utf-8") as f:
            f.write(data.model_dump_json(indent=2))
        logger.info("Source market geo cache written to %s", _CACHE_FILE)
    except OSError as exc:
        logger.error("Failed to write source market geo cache: %s", exc)


def read_cache() -> SourceMarketGeoResponse | None:
    if not _CACHE_FILE.exists():
        return None
    try:
        with open(_CACHE_FILE, "r", encoding="utf-8") as f:
            content = f.read()
            return SourceMarketGeoResponse.model_validate_json(content)
    except Exception as exc:
        logger.warning("Source market geo cache invalid/corrupt: %s", exc)
        return None

def determine_trigger(cached_data: SourceMarketGeoResponse | None) -> tuple[bool, str]:
    if cached_data is None:
        return True, "INITIAL_LOAD"
        
    cached_at = parse_iso_datetime(cached_data.cache_metadata.cached_at)
    expires_at = parse_iso_datetime(cached_data.cache_metadata.cache_expires_at)
    
    if now_utc() >= expires_at:
        return True, "SCHEDULED"
        
    return False, "CACHE_HIT"
