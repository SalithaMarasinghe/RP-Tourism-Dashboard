from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
import logging

from models.review_intelligence import LocationListResponse, LocationDetailResponse
from services.review_intelligence_service import ReviewIntelligenceService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/review-intelligence", tags=["Review Intelligence"])

# Global instance for the service, initialized at startup
_service_instance: Optional[ReviewIntelligenceService] = None

def get_review_service() -> ReviewIntelligenceService:
    """Dependency to inject the ReviewIntelligenceService."""
    if _service_instance is None:
        logger.error("ReviewIntelligenceService accessed before initialization.")
        raise HTTPException(status_code=500, detail="Review Intelligence service not initialized")
    return _service_instance

def init_review_service(csv_path: str):
    """Initialization helper called from server.py startup."""
    global _service_instance
    _service_instance = ReviewIntelligenceService(csv_path)

@router.get("/locations", 
            response_model=LocationListResponse,
            summary="Get all locations",
            description="Returns a list of all locations with their sentiment summaries, sorted by overall score descending.")
async def get_locations(service: ReviewIntelligenceService = Depends(get_review_service)):
    return service.get_all_locations()

@router.get("/locations/filter", 
            response_model=LocationListResponse,
            summary="Filter locations by status",
            description="Returns locations filtered by sentiment status (GOOD, MODERATE, LOW).")
async def filter_locations(
    status: str = Query(..., description="Filter by status: GOOD, MODERATE, or LOW"),
    service: ReviewIntelligenceService = Depends(get_review_service)
):
    return service.get_locations_by_status(status)

@router.get("/locations/{location_name}", 
            response_model=LocationDetailResponse,
            summary="Get location details",
            description="Returns detailed sentiment analysis for a specific location. Use URL-encoded name.")
async def get_location_detail(
    location_name: str,
    service: ReviewIntelligenceService = Depends(get_review_service)
):
    detail = service.get_location_by_name(location_name)
    if not detail:
        raise HTTPException(status_code=404, detail=f"Location '{location_name}' not found")
    return detail

@router.get("/health",
            summary="Health check",
            description="Returns the operational status of the Review Intelligence module.")
async def health_check(service: ReviewIntelligenceService = Depends(get_review_service)):
    return service.get_health()
