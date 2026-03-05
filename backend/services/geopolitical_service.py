"""
geopolitical_service.py
~~~~~~~~~~~~~~~~~~~~~~~
Geopolitical impact analysis pipeline for the Sri Lanka Tourism Dashboard.

Pipeline steps:
  1. Google Custom Search (6 queries across 15 authoritative domains)
  2. Variable injection into Part B of the Gemini prompt
  3. Gemini API call with Part A as system_instruction
  4. JSON response parsing & validation
  5. Cache read/write via local JSON file
"""
import json
import logging
import os
import re
from pathlib import Path

from datetime import datetime, timedelta
from tavily import TavilyClient
from groq import Groq

logger = logging.getLogger(__name__)

# ── Paths ─────────────────────────────────────────────────────────────────────
_BACKEND_DIR = Path(__file__).parent.parent
_PROMPT_FILE = _BACKEND_DIR / "prompts" / "geopolitical_impact_agent_prompt.txt"
_CACHE_DIR = _BACKEND_DIR / "cache"
_CACHE_FILE = _CACHE_DIR / "geopolitical_tile_cache.json"

# ── Required top-level keys in Gemini JSON response ──────────────────────────
_REQUIRED_KEYS = {
    "tile_type", "situation_summary", "adjustment",
    "tile_display", "suggestions", "data_quality", "cache_metadata",
}

# ── Signal category tags by query index ──────────────────────────────────────
_QUERY_CATEGORIES = [
    "CONFLICT",
    "REGIONAL_IMPACT",
    "TOURISM_DIRECT",
    "AIRLINE_DISRUPTION",
    "OIL_PRICE",
    "GLOBAL_SCAN",
]

# ── All 15 authoritative domains the search engine is scoped to ───────────────
_ALL_DOMAINS = [
    "www.reuters.com", "www.bbc.com", "apnews.com",
    "www.aljazeera.com", "www.theguardian.com",
    "travel.state.gov", "www.gov.uk", "www.dfat.gov.au",
    "oilprice.com", "www.bloomberg.com", "www.ft.com",
    "aviationherald.com", "www.flightradar24.com",
    "www.sltda.gov.lk", "www.unwto.org",
]


# ── Part A / Part B loader ─────────────────────────────────────────────────────
def load_prompt_parts() -> tuple[str, str]:
    """
    Read the Gemini agent prompt file and return (part_a, part_b) as strings.
    Splits on the section-header delimiters embedded in the file.
    """
    content = _PROMPT_FILE.read_text(encoding="utf-8")

    part_a_marker = "PART A — SYSTEM INSTRUCTION"
    part_b_marker = "PART B — DASHBOARD TILE TASK PROMPT"

    idx_a = content.find(part_a_marker)
    idx_b = content.find(part_b_marker)

    if idx_a == -1 or idx_b == -1:
        raise ValueError(
            "Could not locate PART A / PART B delimiters in the prompt file."
        )

    # Part A: from the marker line up to (but not including) Part B's section
    part_a = content[idx_a: idx_b].strip()
    # Part B: everything from its marker to the end of the file
    part_b = content[idx_b:].strip()

    return part_a, part_b


# ── Variable injection ─────────────────────────────────────────────────────────
def inject_variables(
    part_b: str,
    current_date: str,
    current_time: str,
    current_month: str,
    current_year: str,
    baseline_arrivals: int,
    model_confidence: float,
    trigger_type: str,
    day_of_week: str,
) -> str:
    """
    Replace all {{ VARIABLE }} placeholders in Part B with live values.
    Raises ValueError if any placeholder remains after substitution.
    """
    substitutions = {
        "{{ CURRENT_DATE }}": current_date,
        "{{ CURRENT_TIME }}": current_time,
        "{{ CURRENT_MONTH }}": current_month,
        "{{ CURRENT_YEAR }}": current_year,
        "{{ BASELINE_ARRIVALS }}": str(baseline_arrivals),
        "{{ MODEL_CONFIDENCE }}": str(model_confidence),
        "{{ TRIGGER_TYPE }}": trigger_type,
        "{{ DAY_OF_WEEK }}": day_of_week,
    }

    result = part_b
    for placeholder, value in substitutions.items():
        result = result.replace(placeholder, value)

    # Verify zero placeholders remain
    remaining = re.findall(r"\{\{.*?\}\}", result)
    if remaining:
        raise ValueError(
            f"Variable injection incomplete — remaining placeholders: {remaining}"
        )

    return result


# ── Tavily Search execution ─────────────────────────────────────────────
def execute_geopolitical_search(current_month: str, current_year: str) -> str:
    client = TavilyClient(api_key=os.environ.get("TAVILY_API_KEY"))

    queries = [
        {
            "query": f"Iran US Israel conflict update {current_month} {current_year}",
            "category": "CONFLICT"
        },
        {
            "query": f"Middle East war tourism travel impact Asia {current_year}",
            "category": "REGIONAL_IMPACT"
        },
        {
            "query": f"Sri Lanka tourism travel advisory {current_month} {current_year}",
            "category": "TOURISM_DIRECT"
        },
        {
            "query": f"Dubai Doha Abu Dhabi flight routes South Asia disruption {current_year}",
            "category": "AIRLINE_DISRUPTION"
        },
        {
            "query": f"oil price airline fares travel impact {current_month} {current_year}",
            "category": "OIL_PRICE"
        },
        {
            "query": f"global conflict crisis international tourism {current_month} {current_year}",
            "category": "GLOBAL_SCAN"
        }
    ]

    all_results = []
    domains_with_results = []
    domains_with_no_results = []

    for item in queries:
        try:
            response = client.search(
                query=item["query"],
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
                    domain = r.get("url", "").split("/")[2] if "/" in r.get("url","") else "unknown"
                    if domain not in domains_with_results:
                        domains_with_results.append(domain)
                    formatted.append(
                        f"  - [{r.get('title','')}] | {domain} | {r.get('published_date','N/A')}\n"
                        f"    {r.get('content','')[:300]}\n"
                        f"    URL: {url}"
                    )

            all_results.append(
                f"Query [{item['category']}]: {item['query']}\n"
                f"Results ({len(formatted)} found):\n" +
                ("\n".join(formatted) if formatted else "  No results found for this query.")
            )

        except Exception as e:
            logger.error(f"Tavily search error for query '{item['query']}': {e}")
            all_results.append(
                f"Query [{item['category']}]: {item['query']}\n"
                f"Results: Search failed — {str(e)}"
            )

    context_block = (
        "SEARCH RESULTS CONTEXT (use this as your sole geopolitical intelligence source):\n"
        "NOTE: Results are from Tavily real-time web search (last 30 days).\n"
        "All signals must be grounded in results below. "
        "Anything not found here is UNCONFIRMED.\n"
        "---\n" +
        "\n---\n".join(all_results) +
        "\n---\n"
        f"DOMAINS WITH RESULTS THIS RUN: {', '.join(domains_with_results) if domains_with_results else 'None'}\n"
    )
    return context_block



# ── Gemini pipeline ────────────────────────────────────────────────────────────
def run_pipeline(
    current_date: str,
    current_time: str,
    current_month: str,
    current_year: str,
    baseline_arrivals: int,
    model_confidence: float,
    trigger_type: str,
    day_of_week: str,
) -> dict:
    """
    Full geopolitical analysis pipeline:
      1. Execute Google Search
      2. Load & inject prompt variables
      3. Call Gemini
      4. Parse & validate JSON response
      5. Return validated dict
    """
    # Step 1 — Tavily Search (failure is non-fatal; returns fallback note)
    try:
        search_context = execute_geopolitical_search(current_month, current_year)
    except Exception as exc:
        logger.error("Tavily Search execution failed entirely: %s", exc)
        search_context = (
            f"NOTE: Web search was unavailable for this pipeline run. Apply your "
            f"internal knowledge calibrated to {current_month} {current_year} "
            f"and the geopolitical context most likely relevant to Sri Lanka tourism "
            f"during this period. Mark all signals as UNCONFIRMED in the output."
        )

    # Step 2 — Load and inject prompt
    part_a, part_b = load_prompt_parts()
    injected_part_b = inject_variables(
        part_b,
        current_date=current_date,
        current_time=current_time,
        current_month=current_month,
        current_year=current_year,
        baseline_arrivals=baseline_arrivals,
        model_confidence=model_confidence,
        trigger_type=trigger_type,
        day_of_week=day_of_week,
    )

    # Append search context to the user turn
    full_user_turn = injected_part_b + "\n\n" + search_context

    # Step 3 — Groq call
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        api_key = os.getenv("GEMINI_GEOPOLITICAL_API_KEY") # fallback variable name for backward compat if they rename it
    
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

    # Step 4 — Strip markdown fences and whitespace
    cleaned = raw_text.strip()
    # Remove ```json ... ``` or ``` ... ``` fences if present
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.MULTILINE)
    cleaned = re.sub(r"\s*```$", "", cleaned, flags=re.MULTILINE)
    cleaned = cleaned.strip()

    # Step 5 — Parse JSON
    try:
        result = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise ValueError(
            f"Gemini response could not be parsed as JSON.\n"
            f"JSON error: {exc}\n"
            f"Raw Gemini response:\n{raw_text}"
        ) from exc

    # Step 6 — Validate required top-level keys
    missing_keys = _REQUIRED_KEYS - set(result.keys())
    if missing_keys:
        raise ValueError(
            f"Gemini JSON response missing required keys: {missing_keys}\n"
            f"Raw Gemini response:\n{raw_text}"
        )

    return result


# ── Cache read / write ─────────────────────────────────────────────────────────
def write_cache(data: dict) -> None:
    """Serialize data as JSON and write to the local cache file."""
    _CACHE_DIR.mkdir(parents=True, exist_ok=True)
    try:
        with open(_CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        logger.info("Geopolitical tile cache written to %s", _CACHE_FILE)
    except OSError as exc:
        logger.error("Failed to write geopolitical tile cache: %s", exc)


def read_cache() -> dict | None:
    """
    Read and deserialize the local cache file.
    Returns None if the file does not exist or is corrupted.
    """
    if not _CACHE_FILE.exists():
        return None
    try:
        with open(_CACHE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError) as exc:
        logger.warning("Geopolitical tile cache is invalid/corrupt: %s", exc)
        return None
