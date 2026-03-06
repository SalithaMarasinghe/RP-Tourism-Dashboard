from typing import List, Optional
from pydantic import BaseModel

class GeopoliticalActiveSignal(BaseModel):
    signal_name: str
    relevance_score: float
    impact_direction: str
    impact_magnitude: str
    impact_channel: List[str]
    confirmed: bool
    source_domain: str
    source_summary: str

class GeopoliticalSituationSummary(BaseModel):
    headline: str
    severity_level: str
    severity_rationale: str
    search_scope_note: str
    active_signals: List[GeopoliticalActiveSignal]

class GeopoliticalAdjustment(BaseModel):
    baseline_arrivals: int
    adjustment_percentage: float
    adjusted_arrivals: int
    adjusted_arrivals_lower_bound: int
    adjusted_arrivals_upper_bound: int
    adjustment_basis: str

class GeopoliticalTileDisplay(BaseModel):
    primary_label: str
    primary_value: str
    delta_label: str
    delta_value: str
    delta_direction: str
    confidence_range_label: str
    confidence_range_value: str
    situation_badge: str
    situation_badge_text: str
    data_freshness_label: str
    staleness_warning: Optional[str] = None
    tooltip_summary: str

class GeopoliticalDataQuality(BaseModel):
    search_freshness: str
    signal_count_evaluated: int
    signal_count_applied: int
    signal_count_unconfirmed: int
    domains_with_results: List[str]
    domains_with_no_results: List[str]
    data_gaps: List[str]
    confidence_note: str

class GeopoliticalCacheMetadata(BaseModel):
    cached_at: str
    cache_expires_at: str
    trigger_type: str
    next_scheduled_refresh: str

class GeopoliticalTileResponse(BaseModel):
    tile_type: str
    generated_at: str
    forecast_month: str
    situation_summary: GeopoliticalSituationSummary
    adjustment: GeopoliticalAdjustment
    tile_display: GeopoliticalTileDisplay
    suggestions: List[str]
    data_quality: GeopoliticalDataQuality
    cache_metadata: GeopoliticalCacheMetadata
