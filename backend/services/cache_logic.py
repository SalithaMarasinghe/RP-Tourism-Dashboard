"""
cache_logic.py
~~~~~~~~~~~~~~
Server-side cache decision logic for the Geopolitical Tile feature.
Determines whether to run the full Gemini pipeline or serve cached data.
"""
from datetime import datetime, timezone
from typing import Optional, Tuple

from models.geopolitical_models import GeopoliticalTileResponse


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def parse_iso_datetime(dt_string: str) -> datetime:
    return datetime.fromisoformat(dt_string.replace("Z", "+00:00"))


def determine_trigger(
    cached_data: Optional[GeopoliticalTileResponse],
    current_baseline_arrivals: int
) -> Tuple[bool, str]:
    """
    Evaluates cache state and returns:
      (should_run_pipeline: bool, trigger_type: str)

    Rules (evaluated in order):
      1. No cache          → INITIAL_LOAD
      2. RED + >48h        → RED_ALERT_REFRESH
      3. Baseline drift >15% → BASELINE_DRIFT
      4. Cache ≥7 days     → SCHEDULED
      5. Otherwise         → CACHE_HIT (do NOT re-run)
    """
    # Rule 1: No cache exists
    if cached_data is None:
        return True, "INITIAL_LOAD"

    cached_at = parse_iso_datetime(
        cached_data.cache_metadata.cached_at
    )
    hours_since_cache = (now_utc() - cached_at).total_seconds() / 3600

    # Rule 2: RED severity + more than 48 hours since last cache
    severity = cached_data.situation_summary.severity_level
    if severity == "RED" and hours_since_cache > 48:
        return True, "RED_ALERT_REFRESH"

    # Rule 3: Baseline arrivals drifted more than ±15%
    cached_baseline = cached_data.adjustment.baseline_arrivals
    if cached_baseline > 0:
        drift_pct = abs(
            current_baseline_arrivals - cached_baseline
        ) / cached_baseline * 100
        if drift_pct > 15:
            return True, "BASELINE_DRIFT"

    # Rule 4: Cache is 7 days (168 hours) or older
    if hours_since_cache >= 168:
        return True, "SCHEDULED"

    # Rule 5: Cache is valid
    return False, "CACHE_HIT"
