"""
cache_service.py
~~~~~~~~~~~~~~~~
Cache management for Geopolitical Revenue Analyzer results.

Handles:
- Reading cached results from JSON file
- Writing new results with expiry timestamp
- Checking cache staleness and validity
- Computing staleness warnings
- RED severity special handling (48-hour expiry)
- Cache invalidation based on baseline drift

Cache file location: /backend/cache/revenue_geo_cache.json
"""

import json
import logging
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from models.revenue_geo_models import RevenueGeoTileResponse

logger = logging.getLogger(__name__)


class RevenueGeoCacheService:
    """
    Manages server-side JSON file cache for revenue geo analysis results.
    """

    def __init__(self):
        """Initialize cache directory path."""
        self.cache_dir = Path(__file__).parent.parent.parent / "backend" / "cache"
        self.cache_file = self.cache_dir / "revenue_geo_cache.json"
        
        # Create cache directory if it doesn't exist
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    def read_cache(self) -> Optional[Dict[str, Any]]:
        """
        Read cached analysis result from file.
        
        Returns:
            Dict with cached RevenueGeoTileResponse and metadata, or None if no cache
        """
        if not self.cache_file.exists():
            logger.info("No cache file found")
            return None

        try:
            with open(self.cache_file, 'r', encoding='utf-8') as f:
                cache_data = json.load(f)
            logger.info("Cache file read successfully")
            return cache_data
        except Exception as e:
            logger.error(f"Error reading cache file: {e}")
            return None

    def write_cache(self, tile_response: RevenueGeoTileResponse) -> bool:
        """
        Write analysis result to cache file.
        
        Args:
            tile_response: RevenueGeoTileResponse object to cache
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Serialize the Pydantic model to dict
            cache_data = {
                "result": tile_response.dict(),
                "written_at": datetime.utcnow().isoformat() + "Z"
            }

            with open(self.cache_file, 'w', encoding='utf-8') as f:
                json.dump(cache_data, f, indent=2)
            
            logger.info("Cache file written successfully")
            return True
        except Exception as e:
            logger.error(f"Error writing cache file: {e}")
            return False

    def is_cache_valid(self) -> bool:
        """
        Check if cached result exists and has not expired.
        
        Returns:
            True if cache exists and hasn't expired, False otherwise
        """
        cached = self.read_cache()
        if not cached:
            return False

        try:
            tile_response = cached.get("result", {})
            cache_metadata = tile_response.get("cache_metadata", {})
            expires_at_str = cache_metadata.get("cache_expires_at", "")
            
            if not expires_at_str:
                return False

            # Parse ISO 8601 timestamp and compare
            expires_at = datetime.fromisoformat(expires_at_str.replace('Z', '+00:00'))
            now = datetime.utcnow().replace(tzinfo=expires_at.tzinfo)

            is_valid = now < expires_at
            
            if is_valid:
                logger.info("Cache is still valid")
            else:
                logger.info("Cache has expired")
            
            return is_valid
        except Exception as e:
            logger.error(f"Error checking cache validity: {e}")
            return False

    def get_cache_age_hours(self) -> Optional[float]:
        """
        Get age of cached result in hours.
        
        Returns:
            Age in hours, or None if no cache
        """
        cached = self.read_cache()
        if not cached:
            return None

        try:
            tile_response = cached.get("result", {})
            generated_at_str = tile_response.get("generated_at", "")
            
            if not generated_at_str:
                return None

            generated_at = datetime.fromisoformat(generated_at_str.replace('Z', '+00:00'))
            now = datetime.utcnow().replace(tzinfo=generated_at.tzinfo)
            
            age = (now - generated_at).total_seconds() / 3600
            return age
        except Exception as e:
            logger.error(f"Error computing cache age: {e}")
            return None

    def compute_staleness_warning(self) -> Optional[str]:
        """
        Compute staleness warning message if cache is 4-7 days old.
        
        Returns:
            Warning string or None
        """
        age_hours = self.get_cache_age_hours()
        if age_hours is None:
            return None

        age_days = age_hours / 24

        if 4 <= age_days < 7:
            # Extract next_scheduled_refresh from cache
            cached = self.read_cache()
            if cached:
                tile_response = cached.get("result", {})
                cache_metadata = tile_response.get("cache_metadata", {})
                next_refresh = cache_metadata.get("next_scheduled_refresh", "unknown date")
                
                return f"Geopolitical revenue analysis is {age_days:.1f} days old. Refreshes automatically on {next_refresh}."
        
        return None

    def should_refresh_for_baseline_drift(
        self,
        current_baseline_usd_mn: float,
        drift_threshold: float = 0.15  # 15%
    ) -> bool:
        """
        Check if baseline revenue has drifted enough to trigger re-analysis.
        
        Args:
            current_baseline_usd_mn: Current baseline revenue forecast
            drift_threshold: Threshold for drift (default 15%)
            
        Returns:
            True if drift exceeds threshold, False otherwise
        """
        cached = self.read_cache()
        if not cached:
            return True  # No cache, refresh needed

        try:
            tile_response = cached.get("result", {})
            adjustment = tile_response.get("adjustment", {})
            cached_baseline = adjustment.get("baseline_revenue_usd_mn", 0)

            if cached_baseline == 0:
                return False

            drift_pct = abs(current_baseline_usd_mn - cached_baseline) / cached_baseline
            
            if drift_pct > drift_threshold:
                logger.info(f"Baseline drift detected: {drift_pct:.1%} > {drift_threshold:.1%}")
                return True
            
            return False
        except Exception as e:
            logger.error(f"Error checking baseline drift: {e}")
            return False

    def invalidate_cache(self) -> bool:
        """
        Delete the cache file to force refresh.
        
        Returns:
            True if successful or file didn't exist, False on error
        """
        try:
            if self.cache_file.exists():
                self.cache_file.unlink()
                logger.info("Cache file deleted")
            return True
        except Exception as e:
            logger.error(f"Error deleting cache file: {e}")
            return False

    def get_cached_response(self) -> Optional[RevenueGeoTileResponse]:
        """
        Get the cached response as a Pydantic model.
        
        Returns:
            RevenueGeoTileResponse or None
        """
        cached = self.read_cache()
        if not cached:
            return None

        try:
            tile_response = cached.get("result", {})
            return RevenueGeoTileResponse(**tile_response)
        except Exception as e:
            logger.error(f"Error deserializing cached response: {e}")
            return None
