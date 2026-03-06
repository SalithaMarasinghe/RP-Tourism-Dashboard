"""
test_geopolitical_tile.py
~~~~~~~~~~~~~~~~~~~~~~~~~
Tests for the GET and POST endpoint functions in routers/geopolitical_tile.py.
These tests call the async route functions directly, bypassing TestClient to
avoid httpx/starlette version compatibility issues.
"""
import pytest
import json
import os
import asyncio
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock, AsyncMock

from fastapi.responses import JSONResponse
from models.geopolitical_models import GeopoliticalTileResponse

# Force valid env vars before importing routers
os.environ["GROQ_API_KEY"] = "fake-groq"
os.environ["TAVILY_API_KEY"] = "fake-tavily"
os.environ["GOOGLE_SEARCH_API_KEY"] = "fake-gsk"
os.environ["GOOGLE_SEARCH_ENGINE_ID"] = "fake-cx"

# ─── Import route functions after mocking env (avoid Firebase/RAG init) ───────
from routers.geopolitical_tile import (
    get_geopolitical_tile,
    refresh_geopolitical_tile,
    validate_env_vars,
    ConfigurationError,
)

def _make_valid_tile(severity="GREEN", hours_ago=0, baseline=290727):
    """Build a minimal valid tile GeopoliticalTileResponse."""
    cached_at = (datetime.now(timezone.utc) - timedelta(hours=hours_ago))
    expires_at = cached_at + timedelta(days=7)
    return GeopoliticalTileResponse(**{
        "tile_type": "GEOPOLITICAL_SITUATION_ADJUSTMENT",
        "generated_at": cached_at.isoformat(),
        "forecast_month": "March 2026",
        "situation_summary": {
            "headline": "No material disruption.",
            "severity_level": severity,
            "severity_rationale": "All signals GREEN.",
            "search_scope_note": "Test note",
            "active_signals": [],
        },
        "adjustment": {
            "baseline_arrivals": baseline,
            "adjustment_percentage": 0.0,
            "adjusted_arrivals": baseline,
            "adjusted_arrivals_lower_bound": baseline - 5000,
            "adjusted_arrivals_upper_bound": baseline + 5000,
            "adjustment_basis": "No significant signals.",
        },
        "tile_display": {
            "primary_label": "Situation-Adjusted Forecast",
            "primary_value": f"{baseline:,}",
            "delta_label": "vs. Baseline",
            "delta_value": "0.0%",
            "delta_direction": "NEUTRAL",
            "confidence_range_label": "Estimated Range",
            "confidence_range_value": f"{baseline-5000:,} – {baseline+5000:,}",
            "situation_badge": severity,
            "situation_badge_text": "Stable",
            "data_freshness_label": "Updated today",
            "staleness_warning": None,
            "tooltip_summary": "No geopolitical disruption detected.",
        },
        "suggestions": ["Monitor global situation."],
        "data_quality": {
            "search_freshness": "2026-03-05",
            "signal_count_evaluated": 0,
            "signal_count_applied": 0,
            "signal_count_unconfirmed": 0,
            "domains_with_results": [],
            "domains_with_no_results": [],
            "data_gaps": [],
            "confidence_note": "High confidence.",
        },
        "cache_metadata": {
            "cached_at": cached_at.isoformat(),
            "cache_expires_at": expires_at.isoformat(),
            "trigger_type": "INITIAL_LOAD",
            "next_scheduled_refresh": "2026-03-12",
        },
    })

def _run(coro):
    """Run a coroutine synchronously (compatible with Python 3.10)."""
    return asyncio.get_event_loop().run_until_complete(coro)

# ──  Test 13 — CACHE_HIT: Gemini NOT called ──────────────────────────────────
def test_cache_hit_gemini_not_called():
    tile = _make_valid_tile(hours_ago=2)
    with patch("routers.geopolitical_tile.read_cache", return_value=tile), \
         patch("routers.geopolitical_tile.run_pipeline") as mock_pipeline, \
         patch("routers.geopolitical_tile._get_current_baseline", return_value=(290727, 0.95)):
        resp = _run(get_geopolitical_tile())
    assert isinstance(resp, GeopoliticalTileResponse)
    mock_pipeline.assert_not_called()

# ── Test 14 — INITIAL_LOAD: Gemini IS called, cache written ──────────────────
def test_initial_load_gemini_called_cache_written():
    fresh_tile = _make_valid_tile(hours_ago=0)
    with patch("routers.geopolitical_tile.read_cache", return_value=None), \
         patch("routers.geopolitical_tile.run_pipeline", return_value=fresh_tile) as mock_pipeline, \
         patch("routers.geopolitical_tile.write_cache") as mock_write, \
         patch("routers.geopolitical_tile._get_current_baseline", return_value=(290727, 0.95)):
        resp = _run(get_geopolitical_tile())
    assert isinstance(resp, GeopoliticalTileResponse)
    mock_pipeline.assert_called_once()
    mock_write.assert_called_once()

# ── Test 15 — staleness_warning null when N < 4 ──────────────────────────────
def test_staleness_warning_null_when_n_less_than_4():
    tile = _make_valid_tile(hours_ago=48)
    with patch("routers.geopolitical_tile.read_cache", return_value=tile), \
         patch("routers.geopolitical_tile._get_current_baseline", return_value=(290727, 0.95)):
        resp = _run(get_geopolitical_tile())
    assert resp.tile_display.staleness_warning is None

# ── Test 16 — staleness_warning present when N >= 4 ──────────────────────────
def test_staleness_warning_present_when_n_gte_4():
    tile = _make_valid_tile(hours_ago=97)
    with patch("routers.geopolitical_tile.read_cache", return_value=tile), \
         patch("routers.geopolitical_tile._get_current_baseline", return_value=(290727, 0.95)):
        resp = _run(get_geopolitical_tile())
    assert resp.tile_display.staleness_warning is not None
    assert "days old" in resp.tile_display.staleness_warning

# ── Test 17 — RED sets cache_expires_at to +48h ──────────────────────────────
def test_red_result_sets_48h_expiry():
    red_tile = _make_valid_tile(severity="RED", hours_ago=0)
    with patch("routers.geopolitical_tile.read_cache", return_value=None), \
         patch("routers.geopolitical_tile.run_pipeline", return_value=red_tile), \
         patch("routers.geopolitical_tile.write_cache"), \
         patch("routers.geopolitical_tile._get_current_baseline", return_value=(290727, 0.95)):
        resp = _run(get_geopolitical_tile())
    cached_at = datetime.fromisoformat(resp.cache_metadata.cached_at.replace("Z", "+00:00"))
    expires_at = datetime.fromisoformat(resp.cache_metadata.cache_expires_at.replace("Z", "+00:00"))
    diff_hours = (expires_at - cached_at).total_seconds() / 3600
    assert abs(diff_hours - 48) < 1, f"Expected ~48h expiry for RED, got {diff_hours}h"

# ── Test 18 — Non-RED sets cache_expires_at to +7d ───────────────────────────
def test_non_red_result_sets_7d_expiry():
    green_tile = _make_valid_tile(severity="GREEN", hours_ago=0)
    with patch("routers.geopolitical_tile.read_cache", return_value=None), \
         patch("routers.geopolitical_tile.run_pipeline", return_value=green_tile), \
         patch("routers.geopolitical_tile.write_cache"), \
         patch("routers.geopolitical_tile._get_current_baseline", return_value=(290727, 0.95)):
        resp = _run(get_geopolitical_tile())
    cached_at = datetime.fromisoformat(resp.cache_metadata.cached_at.replace("Z", "+00:00"))
    expires_at = datetime.fromisoformat(resp.cache_metadata.cache_expires_at.replace("Z", "+00:00"))
    diff_days = (expires_at - cached_at).total_seconds() / 86400
    assert abs(diff_days - 7) < 0.1, f"Expected ~7d expiry, got {diff_days:.2f} days"

# ── Test 19 — POST /refresh always runs pipeline ─────────────────────────────
def test_refresh_always_runs_pipeline():
    valid_cached = _make_valid_tile(hours_ago=1)
    fresh_tile = _make_valid_tile(hours_ago=0)
    mock_creds = MagicMock()
    mock_creds.credentials = "fake-token"

    with patch("routers.geopolitical_tile.read_cache", return_value=valid_cached), \
         patch("routers.geopolitical_tile.run_pipeline", return_value=fresh_tile) as mock_pipeline, \
         patch("routers.geopolitical_tile.write_cache"), \
         patch("routers.geopolitical_tile.verify_token", new_callable=AsyncMock, return_value={"uid": "u1"}), \
         patch("routers.geopolitical_tile._get_current_baseline", return_value=(290727, 0.95)):
        resp = _run(refresh_geopolitical_tile(credentials=mock_creds))
    assert isinstance(resp, GeopoliticalTileResponse)
    mock_pipeline.assert_called_once()
    call_kwargs = mock_pipeline.call_args[1]
    assert call_kwargs.get("trigger_type") == "MANUAL_OVERRIDE"

# ── Test 20 — POST /refresh requires authorization ───────────────────────────
def test_refresh_requires_auth():
    from fastapi import HTTPException
    mock_creds = MagicMock()
    mock_creds.credentials = "invalid-token"

    with patch("routers.geopolitical_tile.verify_token",
               new_callable=AsyncMock,
               side_effect=HTTPException(status_code=401, detail="Unauthorized")):
        with pytest.raises(HTTPException) as exc_info:
            _run(refresh_geopolitical_tile(credentials=mock_creds))
    assert exc_info.value.status_code in (401, 403)

# ── Test 21 — Gemini failure + valid cache → 503 with last_cached_tile ────────
def test_gemini_failure_with_cache_returns_503_with_cached_tile():
    valid_cached = _make_valid_tile(hours_ago=1)
    with patch("routers.geopolitical_tile.read_cache", return_value=valid_cached), \
         patch("routers.geopolitical_tile.determine_trigger", return_value=(True, "INITIAL_LOAD")), \
         patch("routers.geopolitical_tile.run_pipeline", side_effect=ValueError("Gemini error")), \
         patch("routers.geopolitical_tile._get_current_baseline", return_value=(290727, 0.95)):
        resp = _run(get_geopolitical_tile())
    assert resp.status_code == 503
    body = json.loads(resp.body)
    assert "last_cached_tile" in body
    assert body["error"] == "Geopolitical analysis temporarily unavailable."

# ── Test 22 — Gemini failure + no cache → 503, no cached tile ────────────────
def test_gemini_failure_no_cache_returns_503_without_cached_tile():
    with patch("routers.geopolitical_tile.read_cache", return_value=None), \
         patch("routers.geopolitical_tile.run_pipeline", side_effect=ValueError("Gemini error")), \
         patch("routers.geopolitical_tile._get_current_baseline", return_value=(290727, 0.95)):
        resp = _run(get_geopolitical_tile())
    assert resp.status_code == 503
    body = json.loads(resp.body)
    assert "last_cached_tile" not in body
    assert "message" in body

# ── Test 23 — Google Search failure → pipeline continues ─────────────────────
def test_search_failure_pipeline_continues():
    fresh_tile = _make_valid_tile()
    with patch("routers.geopolitical_tile.read_cache", return_value=None), \
         patch("routers.geopolitical_tile.run_pipeline", return_value=fresh_tile) as mock_pipeline, \
         patch("routers.geopolitical_tile.write_cache"), \
         patch("routers.geopolitical_tile._get_current_baseline", return_value=(290727, 0.95)):
        resp = _run(get_geopolitical_tile())
    assert isinstance(resp, GeopoliticalTileResponse)
    mock_pipeline.assert_called_once()

# ── Test 24 — Missing env vars → ConfigurationError ─────────────────────────
def test_missing_env_vars_raises_configuration_error():
    with patch.dict(os.environ, {}, clear=True):
        for key in ["GROQ_API_KEY", "TAVILY_API_KEY", "GOOGLE_SEARCH_API_KEY", "GOOGLE_SEARCH_ENGINE_ID"]:
            os.environ.pop(key, None)
        with pytest.raises(ConfigurationError) as exc_info:
            validate_env_vars()
    assert "GROQ_API_KEY" in str(exc_info.value) or \
           "TAVILY_API_KEY" in str(exc_info.value) or \
           "GOOGLE_SEARCH_API_KEY" in str(exc_info.value) or \
           "GOOGLE_SEARCH_ENGINE_ID" in str(exc_info.value)
