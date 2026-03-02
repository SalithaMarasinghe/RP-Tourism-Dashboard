"""
tdms_service.py
~~~~~~~~~~~~~~~
CSV loading and all query logic for the TDMS module.
No FastAPI / HTTP concerns live here.

Data source: forecasts/Future_Tourism_Forecast_5Years.csv
"""
import logging
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd

logger = logging.getLogger(__name__)

_CSV_PATH = Path(__file__).parent.parent / "forecasts" / "Future_Tourism_Forecast_5Years.csv"

# ── In-memory state ───────────────────────────────────────────────────────────

_tdms_data: Optional[List[Dict]] = None
_tdms_by_date: Optional[Dict[str, List[Dict]]] = None
_tdms_by_site: Optional[Dict[str, List[Dict]]] = None
_available_dates: Optional[List[str]] = None
_available_sites: Optional[List[str]] = None


# ── Data loading ──────────────────────────────────────────────────────────────

def load_data() -> bool:
    """Load and index the TDMS CSV into memory. Returns True on success."""
    global _tdms_data, _tdms_by_date, _tdms_by_site, _available_dates, _available_sites

    if not _CSV_PATH.exists():
        logger.warning("TDMS CSV not found at %s", _CSV_PATH)
        return False

    df = pd.read_csv(_CSV_PATH)
    _tdms_data = df.to_dict("records")

    _tdms_by_date = defaultdict(list)
    _tdms_by_site = defaultdict(list)
    for record in _tdms_data:
        _tdms_by_date[record["date"]].append(record)
        _tdms_by_site[record["site"]].append(record)

    _available_dates = sorted(df["date"].unique())
    _available_sites = sorted(df["site"].unique())

    logger.info("TDMS data loaded: %d records, %d sites", len(_tdms_data), len(_available_sites))
    return True


# Load once on import
load_data()


# ── Query functions ───────────────────────────────────────────────────────────

def get_dates() -> List[str]:
    return _available_dates or []


def get_sites() -> List[str]:
    return _available_sites or []


def get_by_date(date: str) -> List[Dict]:
    if _tdms_by_date is None:
        return []
    return list(_tdms_by_date.get(date, []))


def get_by_site(site: str) -> List[Dict]:
    if _tdms_by_site is None:
        return []
    return list(_tdms_by_site.get(site, []))


def reload() -> bool:
    return load_data()


def get_dashboard(date: str) -> Dict[str, Any]:
    records = get_by_date(date)
    if not records:
        return {
            "total_visitors": 0,
            "hotspot_count": 0,
            "highest_loaded_site": None,
            "vli_scores": [],
        }

    total_visitors = sum(r["predicted_total_visitors"] for r in records)
    hotspot_count = sum(1 for r in records if r["vli_score"] > 120)
    highest = max(records, key=lambda x: x["vli_score"])

    return {
        "total_visitors": total_visitors,
        "hotspot_count": hotspot_count,
        "highest_loaded_site": {
            "name": highest["site"],
            "vli_score": highest["vli_score"],
            "visitors": highest["predicted_total_visitors"],
        },
        "vli_scores": [
            {
                "site": r["site"],
                "vli_score": round(r["vli_score"], 1),
                "visitors": r["predicted_total_visitors"],
                "capacity": r["statistical_capacity"],
            }
            for r in records
        ],
    }


def get_monthly(site: str, year: str) -> Dict[str, Any]:
    site_data = [r for r in get_by_site(site) if r["date"].startswith(year)]
    monthly_data: Dict[str, Dict] = {}

    for record in site_data:
        month = record["date"][5:7]
        month_name = datetime.strptime(month, "%m").strftime("%B")
        if month_name not in monthly_data:
            monthly_data[month_name] = {
                "month": month_name,
                "total_visitors": 0,
                "avg_vli": 0,
                "record_count": 0,
            }
        monthly_data[month_name]["total_visitors"] += record["predicted_total_visitors"]
        monthly_data[month_name]["avg_vli"] += record["vli_score"]
        monthly_data[month_name]["record_count"] += 1

    for m in monthly_data.values():
        if m["record_count"] > 0:
            m["avg_vli"] = m["avg_vli"] / m["record_count"]
        del m["record_count"]

    month_order = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
    ]
    sorted_monthly = [monthly_data[m] for m in month_order if m in monthly_data]
    yearly_peak = (
        max(monthly_data.values(), key=lambda x: x["total_visitors"])
        if monthly_data else None
    )
    avg_monthly_volume = (
        sum(m["total_visitors"] for m in monthly_data.values()) / len(monthly_data)
        if monthly_data else 0
    )

    return {
        "monthly_data": sorted_monthly,
        "yearly_peak": yearly_peak,
        "avg_monthly_volume": avg_monthly_volume,
    }


def get_weekly_trend(site: str) -> List[Dict]:
    site_data = sorted(get_by_site(site), key=lambda x: x["date"])
    return [
        {
            "date": site_data[i]["date"],
            "visitors": site_data[i]["predicted_total_visitors"],
            "vli_score": site_data[i]["vli_score"],
        }
        for i in range(0, len(site_data), 7)
    ]
