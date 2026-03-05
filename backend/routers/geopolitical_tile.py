"""
geopolitical_tile.py
~~~~~~~~~~~~~~~~~~~~
FastAPI router for the Geopolitical Situation-Adjusted Prediction Tile.

Endpoints:
  GET  /api/geopolitical-tile         — serve tile (from cache or fresh pipeline)
  POST /api/geopolitical-tile/refresh — force pipeline re-run (authorized users only)
"""
import logging
import math
import os
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse

from auth import verify_token
from services.geopolitical_service import (
    run_pipeline,
    read_cache,
    write_cache,
)
from services.cache_logic import determine_trigger, parse_iso_datetime, now_utc
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
        "current_month": now.strftime("%B"),          # e.g. "March"
        "current_year": now.strftime("%Y"),            # e.g. "2026"
        "day_of_week": now.strftime("%A"),             # e.g. "Thursday"
    }


def _compute_expires_at(cached_at_iso: str, severity: str) -> str:
    """Compute cache_expires_at based on severity level."""
    cached_at = parse_iso_datetime(cached_at_iso)
    if severity == "RED":
        expires = cached_at + timedelta(hours=48)
    else:
        expires = cached_at + timedelta(days=7)
    return expires.isoformat()


def _update_freshness(tile: dict, cached_at_iso: str) -> dict:
    """
    Update tile_display.data_freshness_label and staleness_warning
    based on time elapsed since the cache was written.
    """
    cached_at = parse_iso_datetime(cached_at_iso)
    hours_since_cache = (now_utc() - cached_at).total_seconds() / 3600
    n = math.floor(hours_since_cache / 24)

    # data_freshness_label
    if n == 0:
        label = "Updated today"
    elif n == 1:
        label = "Updated 1 day ago"
    else:
        label = f"Updated {n} days ago"

    tile["tile_display"]["data_freshness_label"] = label

    # staleness_warning
    if n >= 4:
        next_refresh = tile.get("cache_metadata", {}).get("next_scheduled_refresh", "soon")
        tile["tile_display"]["staleness_warning"] = (
            f"Geopolitical data is {n} days old. Refreshes automatically on {next_refresh}."
        )
    else:
        tile["tile_display"]["staleness_warning"] = None

    return tile


# ── GET /api/geopolitical-tile ────────────────────────────────────────────────
@router.get("/geopolitical-tile")
async def get_geopolitical_tile():
    """
    Return the Geopolitical Situation-Adjusted Prediction Tile.

    Cache decision logic (in order):
      1. No cache  → INITIAL_LOAD  → run pipeline
      2. RED + >48h → RED_ALERT_REFRESH → run pipeline
      3. Baseline drift >15% → BASELINE_DRIFT → run pipeline
      4. Cache ≥7 days → SCHEDULED → run pipeline
      5. Valid cache → CACHE_HIT → serve cache (update freshness label only)
    """
    baseline_arrivals, model_confidence = _get_current_baseline()
    cached_data = read_cache()
    should_run, trigger_type = determine_trigger(cached_data, baseline_arrivals)

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
            logger.error("Gemini pipeline failed (ValueError): %s", exc)
            if cached_data:
                return JSONResponse(
                    status_code=503,
                    content={
                        "error": "Geopolitical analysis temporarily unavailable.",
                        "message": "Showing last known data.",
                        "last_cached_tile": cached_data,
                    },
                )
            return JSONResponse(
                status_code=503,
                content={
                    "error": "Geopolitical analysis temporarily unavailable.",
                    "message": (
                        "Baseline forecast is shown below. "
                        "Situation analysis will be available shortly."
                    ),
                },
            )
        except Exception as exc:
            logger.error("Gemini pipeline failed: %s", exc)
            if cached_data:
                return JSONResponse(
                    status_code=503,
                    content={
                        "error": "Geopolitical analysis temporarily unavailable.",
                        "message": "Showing last known data.",
                        "last_cached_tile": cached_data,
                    },
                )
            return JSONResponse(
                status_code=503,
                content={
                    "error": "Geopolitical analysis temporarily unavailable.",
                    "message": (
                        "Baseline forecast is shown below. "
                        "Situation analysis will be available shortly."
                    ),
                },
            )

        # Set freshness label and staleness_warning after fresh pipeline run
        result["tile_display"]["data_freshness_label"] = "Updated today"
        result["tile_display"]["staleness_warning"] = None

        # Compute cache_expires_at
        cached_at_iso = result["cache_metadata"]["cached_at"]
        severity = result["situation_summary"]["severity_level"]
        result["cache_metadata"]["cache_expires_at"] = _compute_expires_at(
            cached_at_iso, severity
        )

        write_cache(result)
        return JSONResponse(content=result)

    # CACHE_HIT: update freshness fields then return
    cached_at_iso = cached_data["cache_metadata"]["cached_at"]
    cached_data = _update_freshness(cached_data, cached_at_iso)
    return JSONResponse(content=cached_data)


# ── POST /api/geopolitical-tile/refresh ──────────────────────────────────────
@router.post("/geopolitical-tile/refresh")
async def refresh_geopolitical_tile(
    credentials: HTTPAuthorizationCredentials = Security(security),
):
    """
    Force a full pipeline re-run regardless of cache state.
    Requires a valid Firebase Bearer token (authorized users only).
    Sets trigger_type = MANUAL_OVERRIDE.
    """
    # Verify token (raises HTTP 401 on failure)
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
            detail=(
                "Geopolitical refresh pipeline failed. "
                f"Details: {str(exc)[:200]}"
            ),
        )

    # Freshness and cache_expires_at
    result["tile_display"]["data_freshness_label"] = "Updated today"
    result["tile_display"]["staleness_warning"] = None

    cached_at_iso = result["cache_metadata"]["cached_at"]
    severity = result["situation_summary"]["severity_level"]
    result["cache_metadata"]["cache_expires_at"] = _compute_expires_at(
        cached_at_iso, severity
    )

    write_cache(result)
    return JSONResponse(content=result)
