"""
revenue_geo_models.py
~~~~~~~~~~~~~~~~~~~~~
Pydantic models for Geopolitical Revenue Analyzer Agent.

Defines the complete data contract for:
1. Active geopolitical signals detected by Tavily search
2. Revenue situation summary and severity assessment
3. Revenue adjustment calculations and projections
4. Dashboard tile display values
5. Data quality and cache metadata
6. Complete response structure

This module parallels geopolitical_models.py but is revenue-focused.
"""

from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime


# ──────────────────────────────────────────────────────────────────────────────
# REvenueGeoActiveSignal
# ──────────────────────────────────────────────────────────────────────────────

class RevenueGeoActiveSignal(BaseModel):
    """
    A distinct geopolitical or macro-travel signal identified from search results
    that affects Sri Lanka tourism revenue for the current month.
    """
    signal_name: str = Field(
        ...,
        description="Short label for the signal (e.g. 'Middle East Conflict', 'Oil Price Spike')"
    )
    relevance_score: float = Field(
        ...,
        gte=0.0,
        lte=1.0,
        description="How directly does this signal affect Sri Lanka tourism revenue this month? (0.0-1.0 scale)"
    )
    impact_direction: str = Field(
        ...,
        description="Direction of impact: NEGATIVE, NEUTRAL, or POSITIVE"
    )
    impact_magnitude: str = Field(
        ...,
        description="Severity of impact: LOW (0-5%), MEDIUM (5-15%), HIGH (15-30%), or SEVERE (30%+)"
    )
    impact_channel: List[str] = Field(
        default_factory=list,
        description="Revenue loss mechanism(s): ARRIVAL_SUPPRESSION, STAY_REDUCTION, SPEND_REDUCTION, "
                    "HIGH_VALUE_SEGMENT_LOSS, AIRLINE_COST_PRESSURE, TRAVEL_ADVISORY_FRICTION, "
                    "FX_TRANSLATION_RISK, CHANNEL_DISRUPTION"
    )
    confirmed: bool = Field(
        ...,
        description="True if directly supported by search results; False if UNCONFIRMED"
    )
    source_domain: str = Field(
        ...,
        description="Domain name where signal was found, or 'UNCONFIRMED' if not found in results"
    )
    source_summary: str = Field(
        ...,
        description="One sentence grounded in search result with approximate date"
    )


class RevenueGeoSituationSummary(BaseModel):
    """
    High-level summary of the current geopolitical situation and its impact on
    Sri Lanka tourism revenue for the current month.
    """
    headline: str = Field(
        ...,
        description="One sentence: dominant revenue risk and main impact channel (max 120 chars)"
    )
    severity_level: str = Field(
        ...,
        description="GREEN (stable), YELLOW (monitor), ORANGE (at risk), or RED (alert)"
    )
    severity_rationale: str = Field(
        ...,
        description="One sentence explaining why this severity level was assigned"
    )
    search_scope_note: str = Field(
        default="Intelligence sourced from Tavily search results provided in the runtime context. "
                "Signals not found there are marked UNCONFIRMED.",
        description="Explanation of search methodology and limitations"
    )
    active_signals: List[RevenueGeoActiveSignal] = Field(
        default_factory=list,
        description="Array of confirmed and unconfirmed signals extracted from search results"
    )


# ──────────────────────────────────────────────────────────────────────────────
# RevenueGeoAdjustment
# ──────────────────────────────────────────────────────────────────────────────

class RevenueGeoAdjustment(BaseModel):
    """
    Quantitative revenue adjustment calculations applied to baseline forecast
    based on confirmed geopolitical signals.
    """
    baseline_revenue_usd_mn: float = Field(
        ...,
        description="Baseline monthly revenue forecast in USD millions"
    )
    baseline_revenue_lkr_mn: float = Field(
        ...,
        description="Baseline monthly revenue forecast in LKR millions"
    )
    adjustment_percentage: float = Field(
        ...,
        description="Combined adjustment from all confirmed signals as percentage (-50% to +10%)"
    )
    adjusted_revenue_usd_mn: float = Field(
        ...,
        description="Baseline adjusted by geopolitical signals in USD millions"
    )
    adjusted_revenue_lkr_mn: float = Field(
        ...,
        description="Adjusted revenue converted to LKR at current rate"
    )
    monthly_revenue_at_risk_usd_mn: float = Field(
        ...,
        ge=0.0,
        description="Monthly tourism revenue exposure in USD millions"
    )
    weekly_revenue_at_risk_usd_mn: float = Field(
        ...,
        ge=0.0,
        description="Weekly approximation of monthly revenue at risk (monthly / 4.345)"
    )
    monthly_revenue_at_risk_lkr_mn: float = Field(
        ...,
        ge=0.0,
        description="Monthly revenue exposure in LKR millions"
    )
    adjusted_revenue_usd_mn_lower_bound: float = Field(
        ...,
        description="Lower bound of confidence interval (adjusted × 0.93)"
    )
    adjusted_revenue_usd_mn_upper_bound: float = Field(
        ...,
        description="Upper bound of confidence interval (adjusted × 1.07)"
    )
    adjustment_basis: str = Field(
        ...,
        description="Two sentences explaining which signals contributed and how"
    )


# ──────────────────────────────────────────────────────────────────────────────
# RevenueGeoTileDisplay
# ──────────────────────────────────────────────────────────────────────────────

class RevenueGeoTileDisplay(BaseModel):
    """
    Formatted values for frontend dashboard tile display.
    """
    primary_label: str = Field(
        default="Situation-Adjusted Revenue Forecast",
        description="Label for primary value display"
    )
    primary_value: str = Field(
        ...,
        description="Formatted adjusted revenue USD (e.g. '$72.40M')"
    )
    secondary_value: str = Field(
        ...,
        description="Formatted adjusted revenue LKR (e.g. 'LKR 23,580M')"
    )
    delta_label: str = Field(
        default="vs. Baseline",
        description="Label for delta/change display"
    )
    delta_value: str = Field(
        ...,
        description="Formatted delta percentage (e.g. '-12.4%')"
    )
    delta_direction: str = Field(
        ...,
        description="DOWN, UP, or NEUTRAL"
    )
    risk_label: str = Field(
        default="Revenue at Risk",
        description="Label for monthly revenue at risk"
    )
    risk_value: str = Field(
        ...,
        description="Formatted monthly risk (e.g. '$43.50M / month')"
    )
    weekly_risk_label: str = Field(
        default="Weekly Risk",
        description="Label for weekly revenue at risk"
    )
    weekly_risk_value: str = Field(
        ...,
        description="Formatted weekly risk (e.g. '$10.01M / week')"
    )
    confidence_range_label: str = Field(
        default="Estimated Range",
        description="Label for confidence interval"
    )
    confidence_range_value: str = Field(
        ...,
        description="Formatted lower-upper USD range (e.g. '$67.41M - $77.39M')"
    )
    situation_badge: str = Field(
        ...,
        description="GREEN, YELLOW, ORANGE, or RED"
    )
    situation_badge_text: str = Field(
        ...,
        description="Badge text: 'Stable', 'Monitor', 'At Risk', or 'Revenue Alert'"
    )
    data_freshness_label: str = Field(
        default="Updated today",
        description="Freshness indicator"
    )
    staleness_warning: Optional[str] = Field(
        default=None,
        description="Warning if cache is 4-7 days old; null otherwise"
    )
    tooltip_summary: str = Field(
        ...,
        description="Plain-English tooltip with dominant signal, adjustment %, at-risk amount (max 280 chars)"
    )


# ──────────────────────────────────────────────────────────────────────────────
# RevenueGeoDataQuality
# ──────────────────────────────────────────────────────────────────────────────

class RevenueGeoDataQuality(BaseModel):
    """
    Metadata describing search coverage, signal quality, and analysis limitations.
    """
    search_freshness: str = Field(
        ...,
        description="Date of most recent search result used (YYYY-MM-DD)"
    )
    signal_count_evaluated: int = Field(
        ...,
        ge=0,
        description="Total distinct signals identified from all search results"
    )
    signal_count_applied: int = Field(
        ...,
        ge=0,
        description="Number of signals with relevance_score >= 0.3 and confirmed=true applied to adjustment"
    )
    signal_count_unconfirmed: int = Field(
        ...,
        ge=0,
        description="Number of signals marked UNCONFIRMED (not applied to adjustment)"
    )
    domains_with_results: List[str] = Field(
        default_factory=list,
        description="Domains that returned relevant search results"
    )
    domains_with_no_results: List[str] = Field(
        default_factory=list,
        description="Search categories with no relevant results"
    )
    data_gaps: List[str] = Field(
        default_factory=list,
        description="Known gaps or uncertainties in the analysis"
    )
    confidence_note: str = Field(
        ...,
        description="One sentence on reliability and limitations of this analysis"
    )


# ──────────────────────────────────────────────────────────────────────────────
# RevenueGeoCacheMetadata
# ──────────────────────────────────────────────────────────────────────────────

class RevenueGeoCacheMetadata(BaseModel):
    """
    Cache lifecycle and refresh metadata for this analysis.
    """
    cached_at: str = Field(
        ...,
        description="ISO 8601 timestamp when this analysis was generated"
    )
    cache_expires_at: str = Field(
        ...,
        description="ISO 8601 timestamp when cache becomes stale (cached_at + 7 days, or +48h if RED)"
    )
    trigger_type: str = Field(
        ...,
        description="How this analysis was triggered: SCHEDULED, MANUAL_OVERRIDE, INITIAL_LOAD, "
                    "RED_ALERT_REFRESH, or BASELINE_DRIFT"
    )
    next_scheduled_refresh: str = Field(
        ...,
        description="Date of next automatic refresh (YYYY-MM-DD)"
    )


# ──────────────────────────────────────────────────────────────────────────────
# RevenueGeoTileResponse
# ──────────────────────────────────────────────────────────────────────────────

class RevenueGeoTileResponse(BaseModel):
    """
    Complete response structure for the Geopolitical Revenue Analyzer tile.
    This is returned to the frontend and cached server-side.
    """
    tile_type: str = Field(
        default="GEOPOLITICAL_REVENUE_ADJUSTMENT",
        description="Identifies this as a revenue geo adjustment tile"
    )
    generated_at: str = Field(
        ...,
        description="ISO 8601 timestamp of generation"
    )
    forecast_month: str = Field(
        ...,
        description="Current forecast month and year (e.g., 'January 2025')"
    )
    situation_summary: RevenueGeoSituationSummary = Field(
        ...,
        description="High-level summary of geopolitical situation and impact"
    )
    adjustment: RevenueGeoAdjustment = Field(
        ...,
        description="Quantitative adjustment calculations"
    )
    tile_display: RevenueGeoTileDisplay = Field(
        ...,
        description="Formatted values for frontend display"
    )
    suggestions: List[str] = Field(
        default_factory=list,
        description="3 actionable suggestions for revenue protection or monitoring"
    )
    data_quality: RevenueGeoDataQuality = Field(
        ...,
        description="Analysis coverage and limitations"
    )
    cache_metadata: RevenueGeoCacheMetadata = Field(
        ...,
        description="Cache lifecycle information"
    )
