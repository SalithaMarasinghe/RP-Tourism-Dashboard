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
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional

from models.revenue_geo_models import RevenueGeoTileResponse
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
        validate_env_vars()
        _prompt_builder = PromptBuilder()
        _tavily_service = TavilySearchService()
        _groq_service = GroqRevenueAgentService()
        _cache_service = RevenueGeoCacheService()
        _baseline_service = RevenueBaselineService()
    
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
        
        # Step 6: Post-process based on severity
        if tile_response.situation_summary.severity_level == "RED":
            # RED severity: shorten cache to 48 hours
            now = datetime.utcnow()
            expires = now + timedelta(hours=48)
            tile_response.cache_metadata.cache_expires_at = expires.isoformat() + "Z"
            logger.info("RED severity detected: cache expires in 48 hours")
        
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
