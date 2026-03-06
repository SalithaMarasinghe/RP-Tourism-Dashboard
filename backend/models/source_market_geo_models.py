from typing import List, Optional
from pydantic import BaseModel, Field

class IntelligenceSummary(BaseModel):
    headline: str
    overall_risk_level: str
    overall_risk_rationale: str
    dominant_event: str
    dominant_event_source: str
    markets_affected_count: int
    markets_at_risk_count: int
    markets_with_opportunity_count: int

class MarketSignal(BaseModel):
    signal_name: str
    signal_source: str
    signal_type: str
    confirmed: bool
    relevance_score: float
    summary: str

class MarketAssessment(BaseModel):
    country: str
    iso3: str
    flag_emoji: str
    segment: str
    status: str
    risk_level: str
    risk_score: float
    impact_direction: str
    impact_magnitude: str
    primary_impact_channel: str
    flight_connectivity_status: str
    signals: List[MarketSignal]
    market_insight: str
    recommended_action: str

class AlertMarket(BaseModel):
    country: str
    iso3: str
    flag_emoji: str
    risk_level: str
    alert_reason: str
    estimated_impact: str
    urgency: str

class OpportunityMarket(BaseModel):
    country: str
    iso3: str
    flag_emoji: str
    opportunity_reason: str
    estimated_upside: str
    recommended_action: str

class HubAlert(BaseModel):
    hub: str
    status: str
    affected_markets: List[str]
    detail: str

class RouteChange(BaseModel):
    route: str
    change_type: str
    affected_market: str
    detail: str

class AviationIntelligence(BaseModel):
    overall_connectivity_status: str
    hub_alerts: List[HubAlert]
    route_changes: List[RouteChange]
    connectivity_note: str

class StrategicRecommendation(BaseModel):
    priority: int
    target_market: str
    recommendation: str
    rationale: str
    timeframe: str

class DataQuality(BaseModel):
    gcs_queries_executed: int
    tavily_queries_executed: int
    total_signals_evaluated: int
    confirmed_signals: int
    unconfirmed_signals: int
    gcs_domains_with_results: List[str]
    gcs_domains_no_results: List[str]
    tavily_results_count: int
    search_freshness: str
    data_gaps: List[str]
    confidence_note: str

class CacheMetadata(BaseModel):
    cached_at: str
    cache_expires_at: str
    trigger_type: str
    next_scheduled_refresh: str

class SourceMarketGeoResponse(BaseModel):
    tile_type: str
    generated_at: str
    analysis_period: str
    intelligence_summary: IntelligenceSummary
    market_assessments: List[MarketAssessment]
    alert_markets: List[AlertMarket]
    opportunity_markets: List[OpportunityMarket]
    aviation_intelligence: AviationIntelligence
    strategic_recommendations: List[StrategicRecommendation]
    data_quality: DataQuality
    cache_metadata: CacheMetadata
