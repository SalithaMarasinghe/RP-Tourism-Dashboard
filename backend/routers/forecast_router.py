"""
forecast_router.py
~~~~~~~~~~~~~~~~~~
FastAPI router for forecast endpoints.
All business / data logic lives in services.forecast_service — these
handlers are intentionally thin.
"""
import logging

from fastapi import APIRouter, HTTPException

from services.forecast_service import (
    get_daily_forecasts,
    get_scenarios,
    get_arrivals_timeline,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/forecasts", tags=["forecasts"])


@router.get("/scenarios")
async def forecast_scenarios():
    """
    Return the baseline, optimistic, and pessimistic explainability reports.

    Each scenario is a list of objects loaded from the corresponding
    ``forecasts/explainability_reports/*.json`` file.
    """
    try:
        return get_scenarios()
    except Exception as exc:
        logger.error("Failed to load forecast scenarios: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to load forecast scenarios")


@router.get("/daily")
async def forecast_daily():
    """
    Return the baseline, optimistic, and pessimistic daily prediction series
    for 2026–2030.

    Each record includes normalised fields: ``year``, ``month``, ``day``,
    and ``total_forecast`` (renamed from ``arrivals_forecast``).
    """
    try:
        return get_daily_forecasts()
    except Exception as exc:
        logger.error("Failed to load daily forecasts: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to load daily forecasts")


@router.get("/arrivals-timeline")
async def forecast_arrivals_timeline():
    """
    Return one monthly timeline containing both historical actual arrivals and
    future predicted arrivals.
    """
    try:
        return get_arrivals_timeline()
    except Exception as exc:
        logger.error("Failed to load arrivals timeline: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to load arrivals timeline")
