from typing import Dict, List, Optional
from pydantic import BaseModel

# ── Bar Chart Race Models ────────────────────────────────────────────────────

class CountryBCR(BaseModel):
    country: str
    iso3: str
    segment: str
    color: str
    arrivals: Dict[str, Optional[int]]

class BarChartRaceResponse(BaseModel):
    years: List[int]
    countries: List[CountryBCR]
    rankings: Dict[str, List[str]]

# ── Choropleth Models ────────────────────────────────────────────────────────

class CountryChoropleth(BaseModel):
    country: str
    iso3: str
    arrivals: int
    yoy_pct: Optional[float]
    segment: str
    rank: int

class ChoroplethFrame(BaseModel):
    year: int
    data: List[CountryChoropleth]
    total_arrivals: int
    top_market: str
    markets_tracked: int
    annotation: Optional[str]

class ChoroplethResponse(BaseModel):
    years: List[int]
    frames: List[ChoroplethFrame]

# ── Sparkline Table Models ───────────────────────────────────────────────────

class SparklineData(BaseModel):
    year: int
    arrivals: int

class SparklineKPIs(BaseModel):
    peak_year: int
    peak_arrivals: Optional[int]
    latest_year: Optional[int]
    latest_arrivals: int
    yoy_pct: Optional[float]
    cagr_pct: Optional[float]
    best_yoy_year: Optional[int]
    best_yoy_pct: Optional[float]
    worst_yoy_year: Optional[int]
    worst_yoy_pct: Optional[float]
    years_in_top3: int
    total_years: int

class CountrySparkline(BaseModel):
    country: str
    iso3: str
    flag_emoji: str
    segment: str
    cluster_id: Optional[int]
    confidence: str
    color: str
    sparkline: List[SparklineData]
    kpis: SparklineKPIs

class SparklineSummary(BaseModel):
    total_countries: int
    mature_count: int
    emerging_count: int
    declining_count: int
    unknown_count: int

class SparklineTableResponse(BaseModel):
    countries: List[CountrySparkline]
    summary: SparklineSummary
