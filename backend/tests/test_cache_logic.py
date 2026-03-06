"""
test_cache_logic.py
~~~~~~~~~~~~~~~~~~~
Tests for all 5 cache decision rules in services/cache_logic.py.

Tests:
  1.  None cache → (True, "INITIAL_LOAD")
  2.  RED + >48h → (True, "RED_ALERT_REFRESH")
  3.  RED + <48h → (False, "CACHE_HIT")
  4.  Drift >15% → (True, "BASELINE_DRIFT")
  5.  Drift ≤15% → does NOT trigger BASELINE_DRIFT
  6.  Cache ≥7 days → (True, "SCHEDULED")
  7.  Valid cache → (False, "CACHE_HIT")
"""
import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import patch
from services.cache_logic import determine_trigger


def _make_cached_data(severity="GREEN", hours_ago=10, cached_baseline=100_000):
    """Helper to build a mock cached_data dict."""
    cached_at = (datetime.now(timezone.utc) - timedelta(hours=hours_ago))
    return {
        "situation_summary": {"severity_level": severity},
        "adjustment": {"baseline_arrivals": cached_baseline},
        "tile_display": {},
        "cache_metadata": {
            "cached_at": cached_at.isoformat(),
            "next_scheduled_refresh": "2026-03-12",
        },
    }


# ─────────────────────────────────────────────────────────────────────────────
# Rule 1 — No cache
# ─────────────────────────────────────────────────────────────────────────────

def test_rule1_no_cache():
    """None cache → returns (True, 'INITIAL_LOAD')."""
    should_run, trigger = determine_trigger(None, current_baseline_arrivals=100_000)
    assert should_run is True
    assert trigger == "INITIAL_LOAD"


# ─────────────────────────────────────────────────────────────────────────────
# Rule 2 — RED severity + >48h
# ─────────────────────────────────────────────────────────────────────────────

def test_rule2_red_over_48h():
    """RED severity + more than 48h → (True, 'RED_ALERT_REFRESH')."""
    cached = _make_cached_data(severity="RED", hours_ago=50)
    should_run, trigger = determine_trigger(cached, current_baseline_arrivals=100_000)
    assert should_run is True
    assert trigger == "RED_ALERT_REFRESH"


def test_rule2_red_under_48h():
    """RED severity + less than 48h → (False, 'CACHE_HIT')  [Rule 2 does NOT fire]."""
    cached = _make_cached_data(severity="RED", hours_ago=24)
    should_run, trigger = determine_trigger(cached, current_baseline_arrivals=100_000)
    assert should_run is False
    assert trigger == "CACHE_HIT"


# ─────────────────────────────────────────────────────────────────────────────
# Rule 3 — Baseline drift >15%
# ─────────────────────────────────────────────────────────────────────────────

def test_rule3_drift_over_15_pct():
    """Drift >15% → (True, 'BASELINE_DRIFT')."""
    cached = _make_cached_data(severity="GREEN", hours_ago=10, cached_baseline=100_000)
    # 20% drift
    should_run, trigger = determine_trigger(cached, current_baseline_arrivals=120_000)
    assert should_run is True
    assert trigger == "BASELINE_DRIFT"


def test_rule3_drift_under_15_pct():
    """Drift ≤15% → does NOT trigger BASELINE_DRIFT."""
    cached = _make_cached_data(severity="GREEN", hours_ago=10, cached_baseline=100_000)
    # 10% drift — should NOT trigger
    should_run, trigger = determine_trigger(cached, current_baseline_arrivals=110_000)
    # Could be CACHE_HIT, but must not be BASELINE_DRIFT
    assert trigger != "BASELINE_DRIFT"


def test_rule3_exact_15_pct_does_not_trigger():
    """Exactly 15% drift → does NOT trigger (must be strictly >15%)."""
    cached = _make_cached_data(severity="GREEN", hours_ago=10, cached_baseline=100_000)
    should_run, trigger = determine_trigger(cached, current_baseline_arrivals=115_000)
    assert trigger != "BASELINE_DRIFT"


# ─────────────────────────────────────────────────────────────────────────────
# Rule 4 — Cache ≥7 days (168h)
# ─────────────────────────────────────────────────────────────────────────────

def test_rule4_cache_7_days():
    """Cache exactly 7 days old → (True, 'SCHEDULED')."""
    cached = _make_cached_data(severity="GREEN", hours_ago=168, cached_baseline=100_000)
    should_run, trigger = determine_trigger(cached, current_baseline_arrivals=100_000)
    assert should_run is True
    assert trigger == "SCHEDULED"


def test_rule4_cache_over_7_days():
    """Cache older than 7 days → (True, 'SCHEDULED')."""
    cached = _make_cached_data(severity="GREEN", hours_ago=200, cached_baseline=100_000)
    should_run, trigger = determine_trigger(cached, current_baseline_arrivals=100_000)
    assert should_run is True
    assert trigger == "SCHEDULED"


# ─────────────────────────────────────────────────────────────────────────────
# Rule 5 — Valid cache (no rule fires)
# ─────────────────────────────────────────────────────────────────────────────

def test_rule5_valid_cache():
    """Valid cache (no trigger criteria met) → (False, 'CACHE_HIT')."""
    cached = _make_cached_data(severity="GREEN", hours_ago=48, cached_baseline=100_000)
    should_run, trigger = determine_trigger(cached, current_baseline_arrivals=100_000)
    assert should_run is False
    assert trigger == "CACHE_HIT"
