from pydantic import BaseModel
from typing import Any, Dict, List, Optional


class DailyForecastItem(BaseModel):
    """Single data point in the daily forecast series."""
    date: str
    year: int
    month: int
    day: int
    total_forecast: float


class ScenariosResponse(BaseModel):
    """Response envelope for /api/forecasts/scenarios."""
    baseline: List[Any]
    optimistic: List[Any]
    pessimistic: List[Any]


class DailyForecastResponse(BaseModel):
    """Response envelope for /api/forecasts/daily."""
    baseline: List[Any]
    optimistic: List[Any]
    pessimistic: List[Any]
