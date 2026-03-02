"""
tdms_router.py
~~~~~~~~~~~~~~
FastAPI router for TDMS (Tourism Data Management System) endpoints.
All data loading and query logic lives in services.tdms_service.
"""
import logging

from fastapi import APIRouter
from services import tdms_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/tdms", tags=["tdms"])


@router.get("/dates")
async def get_tdms_dates():
    """Get all available dates in TDMS data."""
    return {"dates": tdms_service.get_dates()}


@router.get("/sites")
async def get_tdms_sites():
    """Get all available sites in TDMS data."""
    return {"sites": tdms_service.get_sites()}


@router.get("/date/{date}")
async def get_tdms_by_date(date: str):
    """Get all site records for a specific date."""
    return {"data": tdms_service.get_by_date(date)}


@router.get("/site/{site}")
async def get_tdms_by_site(site: str):
    """Get 5-year trend data for a specific site."""
    return {"data": tdms_service.get_by_site(site)}


@router.get("/reload")
async def reload_tdms_data():
    """Reload TDMS data from CSV."""
    success = tdms_service.reload()
    return {"success": success, "message": "Data reloaded" if success else "Failed to reload data"}


@router.get("/dashboard/{date}")
async def get_tdms_dashboard(date: str):
    """Get dashboard summary for a specific date."""
    return tdms_service.get_dashboard(date)


@router.get("/monthly/{site}/{year}")
async def get_monthly_aggregation(site: str, year: str):
    """Get monthly aggregation for a specific site and year."""
    return tdms_service.get_monthly(site, year)


@router.get("/weekly-trend/{site}")
async def get_weekly_trend(site: str):
    """Get weekly downsampled trend data for 5-year period."""
    return {"trend_data": tdms_service.get_weekly_trend(site)}
