import pandas as pd
import logging
from pathlib import Path
from typing import List, Optional
from models.review_intelligence import (
    LocationReviewSummary, 
    AspectScore, 
    LocationListResponse, 
    LocationDetailResponse
)

logger = logging.getLogger(__name__)

def parse_location_scores(filepath: str) -> List[LocationReviewSummary]:
    """
    Reads CSV, groups by location, normalizes scores, and returns list of LocationReviewSummary.
    """
    if not Path(filepath).exists():
        logger.error(f"CSV file not found: {filepath}")
        return []

    try:
        df = pd.read_csv(filepath)
        
        # Mapping functions
        def to_sentiment_pct(polarity):
            return round(((polarity + 1) / 2) * 100, 1)
        
        def to_confidence_pct(confidence):
            return round(confidence * 100, 1)
        
        def get_status(polarity):
            if polarity >= 0.35:
                return "GOOD"
            elif polarity >= 0.20:
                return "MODERATE"
            else:
                return "LOW"

        locations_data = []
        
        grouped = df.groupby('location')
        
        for location_name, group in grouped:
            # All aspects for this location
            aspects = []
            raw_polarities = []
            
            for _, row in group.iterrows():
                polarity = float(row['avg_polarity'])
                confidence = float(row['avg_confidence'])
                
                aspects.append(AspectScore(
                    aspect=row['aspect'],
                    avg_polarity=polarity,
                    avg_confidence=confidence,
                    sentiment_pct=to_sentiment_pct(polarity),
                    confidence_pct=to_confidence_pct(confidence)
                ))
                raw_polarities.append(polarity)
            
            # Sort aspects A-Z
            aspects.sort(key=lambda x: x.aspect)
            
            # Overall metrics
            mean_polarity = sum(raw_polarities) / len(raw_polarities) if raw_polarities else 0.0
            
            locations_data.append(LocationReviewSummary(
                location=str(location_name),
                overall_score_raw=round(mean_polarity, 3),
                overall_score_pct=to_sentiment_pct(mean_polarity),
                status=get_status(mean_polarity),
                total_aspects=len(aspects),
                aspects=aspects
            ))
            
        # Sort locations by overall_score_raw descending
        locations_data.sort(key=lambda x: x.overall_score_raw, reverse=True)
        
        return locations_data

    except Exception as e:
        logger.error(f"Error parsing location scores: {e}")
        return []

class ReviewIntelligenceService:
    """Service to handle review intelligence data operations."""
    
    _instance = None
    
    def __init__(self, csv_path: str):
        logger.info(f"Initializing ReviewIntelligenceService with data from {csv_path}")
        self._data: List[LocationReviewSummary] = parse_location_scores(csv_path)
        logger.info(f"Loaded {len(self._data)} locations for Review Intelligence.")

    def get_all_locations(self) -> LocationListResponse:
        """Returns all locations sorted by score desc."""
        return LocationListResponse(
            locations=self._data,
            total=len(self._data)
        )

    def get_location_by_name(self, name: str) -> Optional[LocationDetailResponse]:
        """Case-insensitive search for a location."""
        name_lower = name.lower()
        for loc in self._data:
            if loc.location.lower() == name_lower:
                return LocationDetailResponse(location=loc)
        return None

    def get_locations_by_status(self, status: str) -> LocationListResponse:
        """Filters by status (GOOD, MODERATE, LOW)."""
        status_upper = status.upper()
        filtered = [loc for loc in self._data if loc.status == status_upper]
        return LocationListResponse(
            locations=filtered,
            total=len(filtered)
        )
    
    def get_health(self):
        """Returns health status and record count."""
        return {
            "status": "ok",
            "records_loaded": len(self._data)
        }
