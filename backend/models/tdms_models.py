"""
tdms_models.py
~~~~~~~~~~~~~~
Pydantic response models for the TDMS module.
"""
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class VliScoreItem(BaseModel):
    site: str
    vli_score: float
    visitors: float
    capacity: float


class HighestLoadedSite(BaseModel):
    name: str
    vli_score: float
    visitors: float


class DashboardResponse(BaseModel):
    total_visitors: float
    hotspot_count: int
    highest_loaded_site: Optional[HighestLoadedSite] = None
    vli_scores: List[VliScoreItem] = []


class MonthlyDataItem(BaseModel):
    month: str
    total_visitors: float
    avg_vli: float


class MonthlyResponse(BaseModel):
    monthly_data: List[MonthlyDataItem]
    yearly_peak: Optional[MonthlyDataItem] = None
    avg_monthly_volume: float


class WeeklyTrendItem(BaseModel):
    date: str
    visitors: float
    vli_score: float
