"""
source_markets_router.py
~~~~~~~~~~~~~~~~~~~~~~~~~
FastAPI router for source market intelligence endpoints.
All business / data logic lives in services.source_markets_service — these
handlers are intentionally thin.
"""
import logging

from fastapi import APIRouter, HTTPException

from models.source_markets_models import (
    BarChartRaceResponse,
    ChoroplethResponse,
    SparklineTableResponse,
)
from services.source_markets_service import (
    get_bar_chart_race_data,
    get_choropleth_data,
    get_sparkline_table_data,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/source-markets", tags=["source-markets"])


@router.get("/bar-chart-race", response_model=BarChartRaceResponse)
async def bar_chart_race():
    """
    Return bar-chart-race data for the top tourist source markets (2010–2025).
    """
    try:
        data = get_bar_chart_race_data()
        if data is None:
            raise HTTPException(status_code=500, detail="Data file not found")
        return data
    except Exception as exc:
        logger.error("Failed to load bar chart race data: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to load bar chart race data")


@router.get("/choropleth", response_model=ChoroplethResponse)
async def choropleth():
    """
    Return per-year choropleth data for the Geographic Source Distribution map.
    """
    try:
        data = get_choropleth_data()
        if data is None:
            raise HTTPException(status_code=500, detail="Data file not found")
        return data
    except Exception as exc:
        logger.error("Failed to load choropleth data: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to load choropleth data")


@router.get("/sparkline-table", response_model=SparklineTableResponse)
async def sparkline_table():
    """
    Return ML-segmented per-country KPIs and sparkline data.
    """
    try:
        data = get_sparkline_table_data()
        if data is None:
            raise HTTPException(
                status_code=500, detail="One or more required data files are missing."
            )
        return data
    except Exception as exc:
        logger.error("Failed to load sparkline data: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to load sparkline data")
