"""
source_market_geo_router.py
~~~~~~~~~~~~~~~~~~~~~~~~~~~
FastAPI router for the Source Market Geo-Intelligence Agent.

Endpoints:
  GET /api/source-markets/geo-intelligence
  GET /api/source-markets/geo-intelligence/status
"""
import logging
import os
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse

from models.source_market_geo_models import SourceMarketGeoResponse
from services.source_market_geo_service import (
    run_pipeline,
    read_cache,
    write_cache,
    compute_expires_at,
    determine_trigger,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/source-markets", tags=["source_market_geo"])


def _get_datetime_params() -> dict:
    now = datetime.now(timezone.utc)
    return {
        "current_date": now.strftime("%Y-%m-%d"),
        "current_time": now.strftime("%H:%M:%S"),
        "current_month": now.strftime("%B"),
        "current_year": now.strftime("%Y"),
        "day_of_week": now.strftime("%A"),
    }


@router.get("/geo-intelligence/status")
async def get_geo_intelligence_status():
    """
    Lightweight endpoint to check the current cache status.
    Used by the frontend to render the initial card shell without waiting for the LLM.
    """
    cached = read_cache()
    if not cached:
        return {
            "cache_exists": False,
            "cached_at": None,
            "cache_expires_at": None,
            "is_stale": True,
            "overall_risk_level": None,
            "markets_affected_count": None,
            "trigger_type": None
        }
        
    should_run, _ = determine_trigger(cached)
    return {
        "cache_exists": True,
        "cached_at": cached.cache_metadata.cached_at,
        "cache_expires_at": cached.cache_metadata.cache_expires_at,
        "is_stale": should_run,
        "overall_risk_level": cached.intelligence_summary.overall_risk_level,
        "markets_affected_count": cached.intelligence_summary.markets_affected_count,
        "trigger_type": cached.cache_metadata.trigger_type
    }


@router.get("/geo-intelligence", response_model=SourceMarketGeoResponse)
async def get_geo_intelligence(refresh: bool = Query(False, description="Bypass cache and force refresh")):
    """
    Returns the full Source Market Geo-Intelligence data.
    Runs the LLM pipeline if the cache is expired, missing, or refresh=true.
    """
    cached_tile = read_cache()
    
    if refresh:
        should_run = True
        trigger_type = "MANUAL_OVERRIDE"
    else:
        should_run, trigger_type = determine_trigger(cached_tile)

    if should_run:
        dt = _get_datetime_params()
        try:
            result = run_pipeline(
                current_date=dt["current_date"],
                current_time=dt["current_time"],
                current_month=dt["current_month"],
                current_year=dt["current_year"],
                trigger_type=trigger_type,
                day_of_week=dt["day_of_week"],
            )
        except ValueError as exc:
            logger.error("LLM pipeline failed parsing JSON: %s", exc)
            if cached_tile:
                return JSONResponse(
                    status_code=503,
                    content={
                        "error": "Source market geo-intelligence temporarily unavailable.",
                        "message": "Showing last known data.",
                        "last_cached_tile": cached_tile.model_dump(),
                    },
                )
            raise HTTPException(status_code=503, detail="Analysis unavailable and no cache exists.")
        except Exception as exc:
            logger.error("LLM pipeline failed: %s", exc)
            if cached_tile:
                return JSONResponse(
                    status_code=503,
                    content={
                        "error": "Source market geo-intelligence temporarily unavailable.",
                        "message": "Showing last known data.",
                        "last_cached_tile": cached_tile.model_dump(),
                    },
                )
            raise HTTPException(status_code=503, detail="Analysis failed and no cache exists.")

        # Recompute expiry
        cached_at_iso = result.cache_metadata.cached_at
        risk_level = result.intelligence_summary.overall_risk_level
        result.cache_metadata.cache_expires_at = compute_expires_at(cached_at_iso, risk_level)

        write_cache(result)
        return result

    # CACHE HIT
    return cached_tile
