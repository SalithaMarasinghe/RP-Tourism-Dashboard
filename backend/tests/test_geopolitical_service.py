"""
test_geopolitical_service.py
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Tests for variable injection and Google Search functions.

Tests:
  8.  Variable injection — all {{ }} fields replaced, none remain
  9.  Google Search — correct API URL, key, cx, dateRestrict=m1
  10. Google Search — correct signal category tagging per query
  11. Google Search — deduplication by URL works
  12. Google Search — domain tracking (with/without results)
"""
import pytest
import re
from unittest.mock import patch, MagicMock, call

from services.geopolitical_service import inject_variables, execute_geopolitical_search


# ─────────────────────────────────────────────────────────────────────────────
# Test 8 — Variable injection
# ─────────────────────────────────────────────────────────────────────────────

SAMPLE_PART_B = (
    "Today is {{ CURRENT_DATE }} ({{ DAY_OF_WEEK }}).\n"
    "Month: {{ CURRENT_MONTH }} {{ CURRENT_YEAR }}\n"
    "Arrivals: {{ BASELINE_ARRIVALS }}\n"
    "Confidence: {{ MODEL_CONFIDENCE }}\n"
    "Trigger: {{ TRIGGER_TYPE }}\n"
)


def test_variable_injection_all_fields_replaced():
    """All {{ }} placeholders are replaced and none remain in the output."""
    result = inject_variables(
        part_b=SAMPLE_PART_B,
        current_date="2026-03-05",
        current_time="10:00:00",
        current_month="March",
        current_year="2026",
        baseline_arrivals=290727,
        model_confidence=0.95,
        trigger_type="INITIAL_LOAD",
        day_of_week="Thursday",
    )
    # All concrete values present
    assert "2026-03-05" in result
    assert "Thursday" in result
    assert "March" in result
    assert "2026" in result
    assert "290727" in result
    assert "0.95" in result
    assert "INITIAL_LOAD" in result

    # Zero {{ }} placeholders remain
    remaining = re.findall(r"\{\{.*?\}\}", result)
    assert remaining == [], f"Remaining placeholders: {remaining}"


def test_variable_injection_raises_on_unresolved_placeholder():
    """inject_variables raises ValueError if an unknown placeholder remains."""
    bad_template = "Hello {{ UNKNOWN_VAR }} and {{ CURRENT_DATE }}"
    with pytest.raises(ValueError, match="remaining placeholders"):
        inject_variables(
            part_b=bad_template,
            current_date="2026-03-05",
            current_time="10:00:00",
            current_month="March",
            current_year="2026",
            baseline_arrivals=290000,
            model_confidence=0.95,
            trigger_type="INITIAL_LOAD",
            day_of_week="Thursday",
        )


# ─────────────────────────────────────────────────────────────────────────────
# Helpers for Tavily Search mocking
# ─────────────────────────────────────────────────────────────────────────────

def _make_tavily_response(results):
    return {"results": results}

MOCK_ENV = {
    "TAVILY_API_KEY": "fake-tavily-key",
}

# ─────────────────────────────────────────────────────────────────────────────
# Test 9 — Correct Queries and structure
# ─────────────────────────────────────────────────────────────────────────────

@patch("services.geopolitical_service.TavilyClient")
@patch.dict("os.environ", MOCK_ENV)
def test_tavily_search_queries_and_params(mock_tavily_class):
    mock_client = MagicMock()
    mock_tavily_class.return_value = mock_client
    mock_client.search.return_value = _make_tavily_response([])

    execute_geopolitical_search("March", "2026")

    assert mock_client.search.call_count == 6
    # Check parameters on first call
    args, kwargs = mock_client.search.call_args_list[0]
    assert kwargs.get("search_depth") == "advanced"
    assert kwargs.get("max_results") == 5
    assert kwargs.get("days") == 30


# ─────────────────────────────────────────────────────────────────────────────
# Test 10 — Context block formatted correctly
# ─────────────────────────────────────────────────────────────────────────────

@patch("services.geopolitical_service.TavilyClient")
@patch.dict("os.environ", MOCK_ENV)
def test_tavily_search_formatting(mock_tavily_class):
    mock_client = MagicMock()
    mock_tavily_class.return_value = mock_client
    mock_client.search.return_value = _make_tavily_response([
        {
            "title": "Test Title",
            "url": "https://www.reuters.com/test",
            "content": "Test content",
            "published_date": "2026-03-05"
        }
    ])

    context = execute_geopolitical_search("March", "2026")

    assert "SEARCH RESULTS CONTEXT" in context
    assert "Test Title" in context
    assert "www.reuters.com" in context
    assert "Test content" in context


# ─────────────────────────────────────────────────────────────────────────────
# Test 11 — Search failure handled gracefully
# ─────────────────────────────────────────────────────────────────────────────

@patch("services.geopolitical_service.TavilyClient")
@patch.dict("os.environ", MOCK_ENV)
def test_tavily_search_failure_handled(mock_tavily_class):
    mock_client = MagicMock()
    mock_tavily_class.return_value = mock_client
    mock_client.search.side_effect = Exception("API Error")

    context = execute_geopolitical_search("March", "2026")

    # Should not raise exception
    assert "Search failed — API Error" in context
