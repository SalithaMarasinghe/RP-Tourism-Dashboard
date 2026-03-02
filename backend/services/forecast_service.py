"""
forecast_service.py
~~~~~~~~~~~~~~~~~~~~
Business logic for forecast endpoints.
All file I/O and data transformations live here — no FastAPI concerns.
"""
import json
import logging
from pathlib import Path
from typing import Any, Dict, List

logger = logging.getLogger(__name__)

# Root of the backend directory (services/ is one level below backend/)
_BACKEND_DIR = Path(__file__).parent.parent
_FORECASTS_DIR = _BACKEND_DIR / "forecasts"

_SCENARIO_FILES: Dict[str, str] = {
    "baseline": "baseline_explainability_report.json",
    "optimistic": "optimistic_explainability_report.json",
    "pessimistic": "pessimistic_explainability_report.json",
}

_DAILY_FILES: Dict[str, str] = {
    "baseline": "baseline_daily_predictions_2026_2030.json",
    "optimistic": "optimistic_daily_predictions_2026_2030.json",
    "pessimistic": "pessimistic_daily_predictions_2026_2030.json",
}


def _load_json(path: Path) -> Any:
    """Read and return parsed JSON from *path*, or [] on failure."""
    if not path.exists():
        logger.warning("Forecast file not found: %s", path)
        return []
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def get_scenarios() -> Dict[str, List[Any]]:
    """
    Return all three explainability-report scenarios.

    Returns:
        {"baseline": [...], "optimistic": [...], "pessimistic": [...]}
    """
    reports_dir = _FORECASTS_DIR / "explainability_reports"
    return {
        key: _load_json(reports_dir / filename)
        for key, filename in _SCENARIO_FILES.items()
    }


def get_daily_forecasts() -> Dict[str, List[Any]]:
    """
    Return all three daily prediction series, with field names normalised.

    Transformations applied per record:
    - ``arrivals_forecast`` renamed to ``total_forecast``
    - ``year``, ``month``, ``day`` integers extracted from ``date`` string

    Returns:
        {"baseline": [...], "optimistic": [...], "pessimistic": [...]}
    """
    daily_dir = _FORECASTS_DIR / "daily_predictions"
    result: Dict[str, List[Any]] = {}

    for key, filename in _DAILY_FILES.items():
        raw: List[Any] = _load_json(daily_dir / filename)

        transformed: List[Any] = []
        for item in raw:
            try:
                year, month, day = item["date"].split("-")
                item["year"] = int(year)
                item["month"] = int(month)
                item["day"] = int(day)
                # Rename forecast field to a stable public name
                if "arrivals_forecast" in item:
                    item["total_forecast"] = item.pop("arrivals_forecast")
            except (KeyError, ValueError) as exc:
                logger.warning("Skipping malformed daily record: %s — %s", item, exc)
                continue
            transformed.append(item)

        result[key] = transformed

    return result
