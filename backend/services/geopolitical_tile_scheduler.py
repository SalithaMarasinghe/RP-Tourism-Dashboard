"""
geopolitical_tile_scheduler.py
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
APScheduler job function for the weekly Geopolitical Tile pipeline refresh.
Kept as a separate module to avoid circular imports with server.py.
"""
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


async def run_scheduled_pipeline() -> None:
    """
    Scheduled job: runs the full geopolitical pipeline every 7 days.
    Reads current baseline, runs pipeline, writes cache.
    Logs success or failure with timestamp.
    """
    start_ts = datetime.now(timezone.utc).isoformat()
    logger.info("[Scheduler] Geopolitical tile refresh started at %s", start_ts)

    try:
        # Import here to avoid circular imports at module load time
        from services.geopolitical_service import run_pipeline, write_cache
        from services.forecast_service import get_scenarios
        from datetime import datetime as dt_cls

        now = datetime.now(timezone.utc)
        current_date = now.strftime("%Y-%m-%d")
        current_time = now.strftime("%H:%M:%S")
        current_month = now.strftime("%B")
        current_year = now.strftime("%Y")
        day_of_week = now.strftime("%A")
        month_key = now.strftime("%Y-%m")

        # Get baseline arrivals for current month
        baseline_arrivals = 290000
        model_confidence = 0.95
        try:
            baseline_records = get_scenarios().get("baseline", [])
            for record in baseline_records:
                if record.get("date", "").startswith(month_key):
                    baseline_arrivals = int(record["total_forecast"])
                    break
        except Exception as exc:
            logger.warning(
                "[Scheduler] Could not retrieve baseline arrivals: %s", exc
            )

        result = run_pipeline(
            current_date=current_date,
            current_time=current_time,
            current_month=current_month,
            current_year=current_year,
            baseline_arrivals=baseline_arrivals,
            model_confidence=model_confidence,
            trigger_type="SCHEDULED",
            day_of_week=day_of_week,
        )

        # Set freshness fields
        result["tile_display"]["data_freshness_label"] = "Updated today"
        result["tile_display"]["staleness_warning"] = None

        # Compute cache_expires_at
        from services.cache_logic import parse_iso_datetime
        from datetime import timedelta
        severity = result["situation_summary"]["severity_level"]
        cached_at = parse_iso_datetime(result["cache_metadata"]["cached_at"])
        if severity == "RED":
            expires = cached_at + timedelta(hours=48)
        else:
            expires = cached_at + timedelta(days=7)
        result["cache_metadata"]["cache_expires_at"] = expires.isoformat()

        write_cache(result)
        end_ts = datetime.now(timezone.utc).isoformat()
        logger.info(
            "[Scheduler] Geopolitical tile refresh completed successfully at %s. "
            "Severity: %s | Adjusted arrivals: %s",
            end_ts,
            result["situation_summary"]["severity_level"],
            result["adjustment"]["adjusted_arrivals"],
        )

    except Exception as exc:
        end_ts = datetime.now(timezone.utc).isoformat()
        logger.error(
            "[Scheduler] Geopolitical tile refresh FAILED at %s: %s",
            end_ts, exc
        )
