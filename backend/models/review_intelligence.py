from pydantic import BaseModel
from typing import List

class AspectScore(BaseModel):
    """Detailed score for a specific aspect."""
    aspect: str
    avg_polarity: float
    avg_confidence: float
    sentiment_pct: float        # polarity mapped to [0–100]
    confidence_pct: float       # confidence mapped to [0–100]

class LocationReviewSummary(BaseModel):
    """Canonical review summary for a location."""
    location: str
    overall_score_raw: float    # mean polarity, 3 decimal places
    overall_score_pct: float    # mean polarity mapped to [0–100]
    status: str                 # "GOOD" | "MODERATE" | "LOW"
    total_aspects: int          # count of aspects
    aspects: List[AspectScore]  # sorted A–Z by name

class LocationListResponse(BaseModel):
    """Response model for a list of locations."""
    locations: List[LocationReviewSummary]
    total: int

class LocationDetailResponse(BaseModel):
    """Response model for a single location detail."""
    location: LocationReviewSummary
