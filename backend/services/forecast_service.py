"""
forecast_service.py
~~~~~~~~~~~~~~~~~~~~
Business logic for forecast endpoints.
All file I/O and data transformations live here — no FastAPI concerns.
"""
import json
import logging
import csv
import os
from datetime import datetime
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

_ARRIVALS_CSV_PATH = _FORECASTS_DIR / "data" / "arrivals_2010_2030.csv"
_DEFAULT_FORECAST_START = "2026-01"


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


def _resolve_forecast_split_date() -> datetime:
    """
    Resolve forecast split date from env var ARRIVALS_FORECAST_START (YYYY-MM).
    Falls back to 2026-01 when missing or invalid.
    """
    split_str = (os.getenv("ARRIVALS_FORECAST_START") or _DEFAULT_FORECAST_START).strip()
    try:
        return datetime.strptime(split_str, "%Y-%m")
    except ValueError:
        logger.warning(
            "Invalid ARRIVALS_FORECAST_START=%s. Falling back to %s.",
            split_str,
            _DEFAULT_FORECAST_START,
        )
        return datetime.strptime(_DEFAULT_FORECAST_START, "%Y-%m")


def get_arrivals_timeline() -> List[Dict[str, Any]]:
    """
    Return monthly arrivals timeline (2010-2030) with actual/predicted labels.

    Source file:
      forecasts/data/arrivals_2010_2030.csv

    Output rows:
      {"date": "YYYY-MM", "arrivals": 123456, "type": "actual|predicted"}
    """
    if not _ARRIVALS_CSV_PATH.exists():
        logger.warning("Arrivals timeline file not found: %s", _ARRIVALS_CSV_PATH)
        return []

    split_date = _resolve_forecast_split_date()
    parsed_rows: List[tuple[datetime, Dict[str, Any]]] = []

    with open(_ARRIVALS_CSV_PATH, "r", encoding="utf-8") as csv_file:
        reader = csv.DictReader(csv_file)
        for line_no, row in enumerate(reader, start=2):
            date_raw = (row.get("date") or "").strip()
            arrivals_raw = (row.get("arrivals") or "").strip()

            if not date_raw or not arrivals_raw:
                logger.warning("Skipping arrivals row %s: missing date/arrivals", line_no)
                continue

            try:
                row_date = datetime.strptime(date_raw, "%Y-%m")
            except ValueError:
                logger.warning("Skipping arrivals row %s: invalid date=%s", line_no, date_raw)
                continue

            try:
                arrivals_value = float(arrivals_raw.replace(",", ""))
            except ValueError:
                logger.warning("Skipping arrivals row %s: invalid arrivals=%s", line_no, arrivals_raw)
                continue

            if arrivals_value < 0:
                logger.warning("Skipping arrivals row %s: negative arrivals=%s", line_no, arrivals_value)
                continue

            parsed_rows.append(
                (
                    row_date,
                    {
                        "date": date_raw,
                        "arrivals": int(round(arrivals_value)),
                        "type": "predicted" if row_date >= split_date else "actual",
                    },
                )
            )

    parsed_rows.sort(key=lambda item: item[0])
    return [item[1] for item in parsed_rows]

def get_upcoming_forecast_context(months: int = 3) -> str:
    """
    Load the baseline explainability report and return a formatted string
    of the upcoming `months` predictions for injection into the LLM prompt.
    """
    try:
        scenarios = get_scenarios()
        baseline = scenarios.get("baseline", [])
        
        if not baseline:
            return "No baseline forecast data available."

        # Grab the first N months (assuming the data starts from current or upcoming period)
        # We cap at N months to save token context
        upcoming = baseline[:months]
        
        lines = ["Baseline Tourist Arrival Forecasts (Before any new events):"]
        for month_data in upcoming:
            date_str = month_data.get("date", "Unknown Date")
            total = month_data.get("total_forecast", 0)
            lines.append(f"- {date_str}: {total:,} arrivals projected")
            
        return "\n".join(lines)
    except Exception as exc:
        logger.warning(f"Failed to generate upcoming forecast context: {exc}")
        return "Forecast projection data currently unavailable."
