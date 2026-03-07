"""
geopolitical_tile.py
~~~~~~~~~~~~~~~~~~~~
FastAPI router for the Geopolitical Situation-Adjusted Prediction Tile.

Endpoints:
  GET  /api/geopolitical-tile         — serve tile (from cache or fresh pipeline)
  POST /api/geopolitical-tile/refresh — force pipeline re-run (authorized users only)
"""
import logging
import os
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse

from auth import verify_token
from models.geopolitical_models import GeopoliticalTileResponse
from services.geopolitical_service import (
    run_pipeline,
    read_cache,
    write_cache,
    compute_expires_at,
    update_freshness,
)
from services.cache_logic import determine_trigger
from services.forecast_service import get_scenarios

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["geopolitical"])
security = HTTPBearer()


class ConfigurationError(Exception):
    """Raised on startup when required environment variables are absent."""


# ── Env-var validation (called on startup) ────────────────────────────────────
def validate_env_vars() -> None:
    """Raise ConfigurationError if any required env var is absent."""
    required = {
        "GROQ_API_KEY",
        "TAVILY_API_KEY",
        "GOOGLE_SEARCH_API_KEY",
        "GOOGLE_SEARCH_ENGINE_ID",
    }
    missing = [k for k in required if not os.getenv(k)]
    if missing:
        # Fallback to GEMINI_GEOPOLITICAL_API_KEY if GROQ isn't there
        if "GROQ_API_KEY" in missing and os.getenv("GEMINI_GEOPOLITICAL_API_KEY"):
            missing.remove("GROQ_API_KEY")
        
        if missing:
            raise ConfigurationError(
                f"Geopolitical tile feature is missing required environment variable(s): "
                f"{', '.join(missing)}. The application cannot start in this state."
            )


# ── Helpers ───────────────────────────────────────────────────────────────────
def _get_current_baseline() -> tuple[int, float]:
    """
    Return (baseline_arrivals, model_confidence) for the current calendar month
    by looking up the baseline explainability report for today's YYYY-MM.
    Falls back to the first available record if the current month is not found.
    """
    today = datetime.now(timezone.utc)
    month_key = today.strftime("%Y-%m")  # e.g. "2026-03"

    try:
        baseline_records = get_scenarios().get("baseline", [])
        for record in baseline_records:
            if record.get("date", "").startswith(month_key):
                return int(record["total_forecast"]), 0.95
        # Fallback: first record
        if baseline_records:
            return int(baseline_records[0]["total_forecast"]), 0.95
    except Exception as exc:
        logger.warning("Could not retrieve baseline arrivals: %s", exc)

    return 290000, 0.95  # safe absolute fallback


def _get_datetime_params() -> dict:
    """Return all datetime parameter strings needed for prompt injection."""
    now = datetime.now(timezone.utc)
    return {
        "current_date": now.strftime("%Y-%m-%d"),
        "current_time": now.strftime("%H:%M:%S"),
        "current_month": now.strftime("%B"),
        "current_year": now.strftime("%Y"),
        "day_of_week": now.strftime("%A"),
    }


# ── GET /api/geopolitical-tile ────────────────────────────────────────────────
@router.get("/geopolitical-tile", response_model=GeopoliticalTileResponse)
async def get_geopolitical_tile():
    """
    Return the Geopolitical Situation-Adjusted Prediction Tile.
    """
    baseline_arrivals, model_confidence = _get_current_baseline()
    cached_tile = read_cache()
    should_run, trigger_type = determine_trigger(cached_tile, baseline_arrivals)

    if should_run:
        dt = _get_datetime_params()
        try:
            result = run_pipeline(
                current_date=dt["current_date"],
                current_time=dt["current_time"],
                current_month=dt["current_month"],
                current_year=dt["current_year"],
                baseline_arrivals=baseline_arrivals,
                model_confidence=model_confidence,
                trigger_type=trigger_type,
                day_of_week=dt["day_of_week"],
            )
        except ValueError as exc:
            logger.error("LLM pipeline failed parsing JSON: %s", exc)
            if cached_tile:
                return JSONResponse(
                    status_code=503,
                    content={
                        "error": "Geopolitical analysis temporarily unavailable.",
                        "message": "Showing last known data.",
                        "last_cached_tile": cached_tile.model_dump(),
                    },
                )
            return JSONResponse(
                status_code=503,
                content={
                    "error": "Geopolitical analysis temporarily unavailable.",
                    "message": "Baseline forecast is shown below.",
                },
            )
        except Exception as exc:
            logger.error("LLM pipeline failed: %s", exc)
            if cached_tile:
                return JSONResponse(
                    status_code=503,
                    content={
                        "error": "Geopolitical analysis temporarily unavailable.",
                        "message": "Showing last known data.",
                        "last_cached_tile": cached_tile.model_dump(),
                    },
                )
            return JSONResponse(
                status_code=503,
                content={
                    "error": "Geopolitical analysis temporarily unavailable.",
                    "message": "Baseline forecast is shown below.",
                },
            )

        result.tile_display.data_freshness_label = "Updated today"
        result.tile_display.staleness_warning = None

        cached_at_iso = result.cache_metadata.cached_at
        severity = result.situation_summary.severity_level
        result.cache_metadata.cache_expires_at = compute_expires_at(cached_at_iso, severity)

        write_cache(result)
        return result

    # CACHE_HIT
    cached_tile = update_freshness(cached_tile)
    return cached_tile


# ── POST /api/geopolitical-tile/refresh ──────────────────────────────────────
@router.post("/geopolitical-tile/refresh", response_model=GeopoliticalTileResponse)
async def refresh_geopolitical_tile(
    credentials: HTTPAuthorizationCredentials = Security(security),
):
    """
    Force a full pipeline re-run regardless of cache state.
    Requires a valid Firebase Bearer token.
    """
    await verify_token(credentials)

    baseline_arrivals, model_confidence = _get_current_baseline()
    dt = _get_datetime_params()

    try:
        result = run_pipeline(
            current_date=dt["current_date"],
            current_time=dt["current_time"],
            current_month=dt["current_month"],
            current_year=dt["current_year"],
            baseline_arrivals=baseline_arrivals,
            model_confidence=model_confidence,
            trigger_type="MANUAL_OVERRIDE",
            day_of_week=dt["day_of_week"],
        )
    except Exception as exc:
        logger.error("Refresh pipeline failed: %s", exc)
        raise HTTPException(
            status_code=503,
            detail=f"Geopolitical refresh pipeline failed. Details: {str(exc)[:200]}",
        )

    result.tile_display.data_freshness_label = "Updated today"
    result.tile_display.staleness_warning = None

    cached_at_iso = result.cache_metadata.cached_at
    severity = result.situation_summary.severity_level
    result.cache_metadata.cache_expires_at = compute_expires_at(cached_at_iso, severity)

    write_cache(result)
    return result
