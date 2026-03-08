"""
routers/revenue_geo.py
~~~~~~~~~~~~~~~~~~~~~~
FastAPI router for Geopolitical Revenue Analyzer endpoints.

Endpoints:
  GET /rev/geo/current
    - Return current geopolitical revenue adjustment tile
    - Check cache first, refresh if needed
  POST /rev/geo/refresh
    - Force manual refresh of analysis
    - Authorized users only
  GET /rev/geo/status
    - Return cache metadata and freshness info

Orchestrates: PromptBuilder, TavilySearchService, GroqRevenueAgentService,
              RevenueGeoCacheService, RevenueBaselineService
"""

import os
import logging
import asyncio
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional

from models.revenue_geo_models import RevenueGeoTileResponse, RevenueGeoActiveSignal
from services.revenue_geo import (
    PromptBuilder,
    TavilySearchService,
    GroqRevenueAgentService,
    RevenueGeoCacheService,
    RevenueBaselineService
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/rev/geo", tags=["Revenue Geopolitical"])

# Global service instances
_prompt_builder: Optional[PromptBuilder] = None
_tavily_service: Optional[TavilySearchService] = None
_groq_service: Optional[GroqRevenueAgentService] = None
_cache_service: Optional[RevenueGeoCacheService] = None
_baseline_service: Optional[RevenueBaselineService] = None

_RISK_KEYWORDS = [
    "iran", "united states", "u.s.", "us strike", "middle east",
    "red sea", "gulf", "strait of hormuz", "missile", "airstrike",
    "travel advisory", "airspace closure", "oil price spike"
]


def _normalize_iso_utc(value: Optional[str], fallback: Optional[datetime] = None) -> str:
    """
    Normalize potentially malformed UTC timestamps (e.g. ending with 'ZZ').
    """
    candidate = (value or "").strip()
    if candidate.endswith("ZZ"):
        candidate = candidate[:-1]
    if candidate.endswith("Z"):
        candidate = candidate[:-1] + "+00:00"

    try:
        parsed = datetime.fromisoformat(candidate)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc).replace(tzinfo=None).isoformat() + "Z"
    except Exception:
        fallback_dt = fallback or datetime.utcnow()
        return fallback_dt.isoformat() + "Z"


def _extract_risk_keyword_hits(tavily_results: dict) -> list[str]:
    """
    Return matched geopolitical-risk keywords from result titles/descriptions/answers.
    """
    corpus_parts = []
    for category in tavily_results.get("categories", {}).values():
        corpus_parts.append(str(category.get("answer", "")))
        for result in category.get("results", []):
            corpus_parts.append(str(result.get("title", "")))
            corpus_parts.append(str(result.get("description", "")))
    corpus = " ".join(corpus_parts).lower()
    return [kw for kw in _RISK_KEYWORDS if kw in corpus]


def _apply_risk_guardrail(
    tile_response: RevenueGeoTileResponse,
    baseline: dict,
    tavily_results: dict
) -> None:
    """
    Escalate to ORANGE when conflict keywords are present but model output is neutral.
    """
    keyword_hits = _extract_risk_keyword_hits(tavily_results)
    if not keyword_hits:
        return

    current_severity = (tile_response.situation_summary.severity_level or "").upper()
    if current_severity in {"ORANGE", "RED"}:
        return

    baseline_usd = float(baseline["baseline_revenue_usd_mn"])
    baseline_lkr = float(baseline["baseline_revenue_lkr_mn"])

    # Enforce a conservative at-risk floor when conflict signals are present.
    current_adj = float(tile_response.adjustment.adjustment_percentage)
    enforced_adj = current_adj if current_adj <= -3.0 else -3.0
    adjusted_usd = round(baseline_usd * (1 + enforced_adj / 100.0), 2)
    adjusted_lkr = round(baseline_lkr * (1 + enforced_adj / 100.0), 2)
    monthly_risk_usd = round(max(0.0, baseline_usd - adjusted_usd), 2)
    weekly_risk_usd = round(monthly_risk_usd / 4.345, 2)
    monthly_risk_lkr = round(max(0.0, baseline_lkr - adjusted_lkr), 2)

    tile_response.situation_summary.severity_level = "ORANGE"
    tile_response.situation_summary.headline = (
        "Heightened geopolitical volatility implies near-term revenue downside risk."
    )
    tile_response.situation_summary.severity_rationale = (
        f"Conflict-related signals detected ({', '.join(keyword_hits[:3])}); "
        "guardrail escalated risk status."
    )

    if not tile_response.situation_summary.active_signals:
        tile_response.situation_summary.active_signals.append(
            RevenueGeoActiveSignal(
                signal_name="Conflict Escalation Risk",
                relevance_score=0.6,
                impact_direction="NEGATIVE",
                impact_magnitude="MEDIUM",
                impact_channel=["ARRIVAL_SUPPRESSION", "AIRLINE_COST_PRESSURE"],
                confirmed=True,
                source_domain="MULTI_SOURCE",
                source_summary="Conflict and travel disruption keywords detected in live search context."
            )
        )

    tile_response.adjustment.adjustment_percentage = round(enforced_adj, 2)
    tile_response.adjustment.adjusted_revenue_usd_mn = adjusted_usd
    tile_response.adjustment.adjusted_revenue_lkr_mn = adjusted_lkr
    tile_response.adjustment.monthly_revenue_at_risk_usd_mn = monthly_risk_usd
    tile_response.adjustment.weekly_revenue_at_risk_usd_mn = weekly_risk_usd
    tile_response.adjustment.monthly_revenue_at_risk_lkr_mn = monthly_risk_lkr
    tile_response.adjustment.adjusted_revenue_usd_mn_lower_bound = round(adjusted_usd * 0.93, 2)
    tile_response.adjustment.adjusted_revenue_usd_mn_upper_bound = round(adjusted_usd * 1.07, 2)
    tile_response.adjustment.adjustment_basis = (
        "Deterministic risk guardrail applied due to conflict-related signal keywords in "
        "retrieved sources."
    )

    tile_response.tile_display.delta_value = f"{enforced_adj:.1f}%"
    tile_response.tile_display.delta_direction = "DOWN"
    tile_response.tile_display.primary_value = f"${adjusted_usd:.2f}M"
    tile_response.tile_display.secondary_value = f"LKR {adjusted_lkr:,.0f}M"
    tile_response.tile_display.risk_value = f"${monthly_risk_usd:.2f}M / month"
    tile_response.tile_display.weekly_risk_value = f"${weekly_risk_usd:.2f}M / week"
    tile_response.tile_display.confidence_range_value = (
        f"${tile_response.adjustment.adjusted_revenue_usd_mn_lower_bound:.2f}M - "
        f"${tile_response.adjustment.adjusted_revenue_usd_mn_upper_bound:.2f}M"
    )
    tile_response.tile_display.situation_badge = "ORANGE"
    tile_response.tile_display.situation_badge_text = "At Risk"
    tile_response.tile_display.tooltip_summary = (
        f"Guardrail applied: conflict-linked signals imply downside risk. "
        f"Estimated revenue at risk ${monthly_risk_usd:.2f}M per month."
    )

    if "Guardrail risk escalation applied from detected conflict signals." not in tile_response.data_quality.data_gaps:
        tile_response.data_quality.data_gaps.append(
            "Guardrail risk escalation applied from detected conflict signals."
        )
    tile_response.data_quality.signal_count_evaluated = max(
        tile_response.data_quality.signal_count_evaluated, 1
    )
    tile_response.data_quality.signal_count_applied = max(
        tile_response.data_quality.signal_count_applied, 1
    )
    tile_response.data_quality.confidence_note = (
        "Conflict-related signals were detected and a deterministic risk floor was applied."
    )


def validate_env_vars() -> None:
    """
    Validate that required environment variables are set.
    
    Raises:
        ValueError if required env vars missing
    """
    required = ["GROQ_API_KEY", "TAVILY_API_KEY"]
    missing = [var for var in required if not os.getenv(var)]
    
    if missing:
        raise ValueError(f"Missing required environment variables: {', '.join(missing)}")


def get_services():
    """
    Initialize and return service instances (lazy load).
    """
    global _prompt_builder, _tavily_service, _groq_service, _cache_service, _baseline_service
    
    if _prompt_builder is None:
        try:
            validate_env_vars()
            _prompt_builder = PromptBuilder()
            _tavily_service = TavilySearchService()
            _groq_service = GroqRevenueAgentService()
            _cache_service = RevenueGeoCacheService()
            _baseline_service = RevenueBaselineService()
        except FileNotFoundError as exc:
            logger.error("Revenue geo prompt file missing: %s", exc)
            raise HTTPException(status_code=500, detail=str(exc)) from exc
        except ValueError as exc:
            logger.error("Revenue geo configuration error: %s", exc)
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        except Exception as exc:
            logger.exception("Revenue geo service initialization failed")
            raise HTTPException(
                status_code=500,
                detail=f"Revenue geo service initialization failed: {exc}"
            ) from exc
    
    return {
        "prompt": _prompt_builder,
        "tavily": _tavily_service,
        "groq": _groq_service,
        "cache": _cache_service,
        "baseline": _baseline_service
    }


async def execute_full_pipeline(
    trigger_type: str = "SCHEDULED"
) -> Optional[RevenueGeoTileResponse]:
    """
    Execute full geopolitical revenue analysis pipeline.
    
    Process:
    1. Get baseline forecast for current month
    2. Execute 7 Tavily searches
    3. Format search results for prompt
    4. Inject variables into prompt template
    5. Call Groq API with task prompt + search context
    6. Parse response into RevenueGeoTileResponse
    7. Write result to cache
    8. Return tile response
    
    Args:
        trigger_type: How pipeline was triggered (SCHEDULED, MANUAL_OVERRIDE, etc.)
        
    Returns:
        RevenueGeoTileResponse or None if critical error
    """
    services = get_services()
    
    try:
        logger.info(f"Starting revenue geo pipeline (trigger: {trigger_type})")
        
        # Step 1: Get baseline
        logger.info("Step 1: Retrieving baseline forecast")
        baseline = services["baseline"].get_current_baseline()
        if not baseline:
            logger.error("Failed to get baseline forecast")
            return None
        
        # Step 2: Execute Tavily searches
        logger.info("Step 2: Executing Tavily searches")
        tavily_results = await services["tavily"].execute_revenue_impact_searches()
        
        # Step 3: Format search results
        logger.info("Step 3: Formatting search results")
        search_context = services["tavily"].format_for_groq(tavily_results)
        
        # Extract domain information
        domains_with_results, domains_no_results = services["tavily"].extract_domains(tavily_results)
        search_error_count = sum(
            1
            for category in tavily_results.get("categories", {}).values()
            if category.get("error")
        )
        total_search_results = sum(
            category.get("result_count", 0)
            for category in tavily_results.get("categories", {}).values()
        )
        
        # Step 4: Build prompt with injected variables
        logger.info("Step 4: Building prompt with variable injection")
        now = datetime.utcnow()
        day_of_week = now.strftime("%A")
        
        part_a, part_b = services["prompt"].inject_variables(
            baseline_revenue_usd_mn=baseline["baseline_revenue_usd_mn"],
            baseline_revenue_lkr_mn=baseline["baseline_revenue_lkr_mn"],
            baseline_arrivals=baseline["baseline_arrivals"],
            avg_spend_per_tourist_usd=baseline["avg_spend_per_tourist_usd"],
            avg_length_of_stay=baseline["avg_length_of_stay"],
            usd_lkr_rate=baseline["usd_lkr_rate"],
            current_month=baseline["current_month"],
            current_year=baseline["current_year"],
            current_date=now.date().isoformat(),
            current_time=now.strftime("%H:%M:%SZ"),
            day_of_week=day_of_week,
            trigger_type=trigger_type,
            model_confidence=0.85,
            search_results=search_context
        )
        
        # Step 5: Call Groq API
        logger.info("Step 5: Calling Groq API")
        tile_response = await services["groq"].analyze_revenue_impact(part_a, part_b)
        
        if not tile_response:
            logger.warning("Groq analysis failed, using safe fallback")
            tile_response = services["groq"].create_safe_green_response(
                baseline_revenue_usd_mn=baseline["baseline_revenue_usd_mn"],
                baseline_revenue_lkr_mn=baseline["baseline_revenue_lkr_mn"],
                baseline_arrivals=baseline["baseline_arrivals"],
                avg_spend_per_tourist_usd=baseline["avg_spend_per_tourist_usd"],
                avg_length_of_stay=baseline["avg_length_of_stay"],
                usd_lkr_rate=baseline["usd_lkr_rate"],
                current_month=baseline["current_month"],
                current_year=baseline["current_year"],
                trigger_type=trigger_type
            )

        now = datetime.utcnow()
        tile_response.generated_at = _normalize_iso_utc(tile_response.generated_at, fallback=now)
        tile_response.cache_metadata.cached_at = _normalize_iso_utc(
            tile_response.cache_metadata.cached_at,
            fallback=now
        )
        tile_response.cache_metadata.cache_expires_at = _normalize_iso_utc(
            tile_response.cache_metadata.cache_expires_at,
            fallback=now + timedelta(days=7)
        )

        # Deterministic post-check: don't allow neutral output if conflict signals are present.
        _apply_risk_guardrail(tile_response, baseline, tavily_results)

        if search_error_count > 0 and tile_response.situation_summary.severity_level == "GREEN":
            tile_response.situation_summary.severity_level = "YELLOW"
            tile_response.situation_summary.headline = (
                "Live geopolitical signal retrieval is degraded; risk should be monitored."
            )
            tile_response.situation_summary.severity_rationale = (
                "One or more search providers failed during this run, so neutral risk cannot be "
                "treated as fully reliable."
            )
            tile_response.tile_display.situation_badge = "YELLOW"
            tile_response.tile_display.situation_badge_text = "Monitor"
            tile_response.tile_display.tooltip_summary = (
                "Search retrieval errors detected. Current adjustment may understate risk."
            )
            if "Search retrieval degraded during runtime." not in tile_response.data_quality.data_gaps:
                tile_response.data_quality.data_gaps.append(
                    "Search retrieval degraded during runtime."
                )
            tile_response.data_quality.confidence_note = (
                "External search retrieval had errors; treat this assessment with caution."
            )

        # Step 6: Post-process based on severity
        if tile_response.situation_summary.severity_level == "RED":
            # RED severity: shorten cache to 48 hours
            now = datetime.utcnow()
            expires = now + timedelta(hours=48)
            tile_response.cache_metadata.cache_expires_at = expires.isoformat() + "Z"
            tile_response.cache_metadata.next_scheduled_refresh = expires.date().isoformat()
            logger.info("RED severity detected: cache expires in 48 hours")
        elif tile_response.situation_summary.severity_level == "ORANGE":
            now = datetime.utcnow()
            expires = now + timedelta(hours=24)
            tile_response.cache_metadata.cache_expires_at = expires.isoformat() + "Z"
            tile_response.cache_metadata.next_scheduled_refresh = expires.date().isoformat()
            logger.info("ORANGE severity detected: cache expires in 24 hours")
        elif tile_response.situation_summary.severity_level == "YELLOW":
            now = datetime.utcnow()
            expires = now + timedelta(hours=12)
            tile_response.cache_metadata.cache_expires_at = expires.isoformat() + "Z"
            tile_response.cache_metadata.next_scheduled_refresh = expires.date().isoformat()
            logger.info("YELLOW severity detected: cache expires in 12 hours")
        elif total_search_results == 0:
            # Avoid pinning stale "no-signal" outputs for a full week.
            now = datetime.utcnow()
            expires = now + timedelta(hours=6)
            tile_response.cache_metadata.cache_expires_at = expires.isoformat() + "Z"
            tile_response.cache_metadata.next_scheduled_refresh = expires.date().isoformat()
            logger.warning("No external search signals found: cache expires in 6 hours")
        
        # Step 7: Write to cache
        logger.info("Step 7: Writing result to cache")
        services["cache"].write_cache(tile_response)
        
        logger.info("Pipeline completed successfully")
        return tile_response
        
    except Exception as e:
        logger.error(f"Pipeline error: {e}")
        return None


@router.get("/current")
async def get_geopolitical_revenue_current() -> RevenueGeoTileResponse:
    """
    Get current geopolitical revenue adjustment tile.
    
    Logic:
    - If cache valid: return cached result
    - If cache expired or doesn't exist: run full pipeline
    - Return RevenueGeoTileResponse
    
    Returns:
        RevenueGeoTileResponse with current analysis or safe GREEN if unavailable
    """
    services = get_services()
    
    # Check cache validity
    if services["cache"].is_cache_valid():
        logger.info("Cache is valid, returning cached result")
        cached_response = services["cache"].get_cached_response()
        if cached_response:
            return cached_response
    else:
        logger.info("Cache missing or expired, executing pipeline")
    
    # Execute full pipeline
    tile_response = await execute_full_pipeline(trigger_type="DASHBOARD_LOAD")
    
    if tile_response:
        return tile_response
    else:
        # Return safe green fallback
        baseline = services["baseline"].get_current_baseline()
        return services["groq"].create_safe_green_response(
            baseline_revenue_usd_mn=baseline["baseline_revenue_usd_mn"],
            baseline_revenue_lkr_mn=baseline["baseline_revenue_lkr_mn"],
            baseline_arrivals=baseline["baseline_arrivals"],
            avg_spend_per_tourist_usd=baseline["avg_spend_per_tourist_usd"],
            avg_length_of_stay=baseline["avg_length_of_stay"],
            usd_lkr_rate=baseline["usd_lkr_rate"],
            current_month=baseline["current_month"],
            current_year=baseline["current_year"],
            trigger_type="FALLBACK"
        )


@router.post("/refresh")
async def refresh_geopolitical_revenue(
    authorization: Optional[str] = None
) -> RevenueGeoTileResponse:
    """
    Force manual refresh of geopolitical revenue analysis.
    
    Authorized users only. Bypasses cache validation and re-runs full pipeline.
    
    Args:
        authorization: Optional authorization token (future use)
        
    Returns:
        RevenueGeoTileResponse with fresh analysis
        
    Raises:
        HTTPException 403 if unauthorized
    """
    # TODO: Add proper authorization checking here
    # For now, allow all requests
    
    logger.info("Manual refresh triggered")
    
    # Execute full pipeline
    tile_response = await execute_full_pipeline(trigger_type="MANUAL_OVERRIDE")
    
    if tile_response:
        return tile_response
    else:
        # Return safe green fallback
        services = get_services()
        baseline = services["baseline"].get_current_baseline()
        return services["groq"].create_safe_green_response(
            baseline_revenue_usd_mn=baseline["baseline_revenue_usd_mn"],
            baseline_revenue_lkr_mn=baseline["baseline_revenue_lkr_mn"],
            baseline_arrivals=baseline["baseline_arrivals"],
            avg_spend_per_tourist_usd=baseline["avg_spend_per_tourist_usd"],
            avg_length_of_stay=baseline["avg_length_of_stay"],
            usd_lkr_rate=baseline["usd_lkr_rate"],
            current_month=baseline["current_month"],
            current_year=baseline["current_year"],
            trigger_type="MANUAL_OVERRIDE_FAILED"
        )


@router.get("/status")
async def get_revenue_geo_status() -> dict:
    """
    Get cache status and freshness information.
    
    Returns:
        Dict with:
        - is_valid: bool - whether cache is still valid
        - age_hours: float - age of cached result in hours (null if no cache)
        - cache_expires_at: str - ISO timestamp of expiry
        - staleness_warning: str - warning message if cache is 4-7 days old (null otherwise)
        - trigger_type: str - how current cache was generated
        - next_scheduled_refresh: str - date of next automatic refresh
    """
    services = get_services()
    
    is_valid = services["cache"].is_cache_valid()
    age_hours = services["cache"].get_cache_age_hours()
    staleness_warning = services["cache"].compute_staleness_warning()
    
    cached = services["cache"].read_cache()
    if cached:
        tile_response = cached.get("result", {})
        cache_metadata = tile_response.get("cache_metadata", {})
        
        return {
            "is_valid": is_valid,
            "age_hours": age_hours,
            "cache_expires_at": cache_metadata.get("cache_expires_at"),
            "staleness_warning": staleness_warning,
            "trigger_type": cache_metadata.get("trigger_type"),
            "next_scheduled_refresh": cache_metadata.get("next_scheduled_refresh")
        }
    else:
        return {
            "is_valid": False,
            "age_hours": None,
            "cache_expires_at": None,
            "staleness_warning": None,
            "trigger_type": None,
            "next_scheduled_refresh": None
        }
