"""
groq_revenue_agent_service.py
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Groq LLM integration for Geopolitical Revenue Analysis.

Calls Groq API with:
- System instruction (Part A of prompt)
- Task prompt with injected variables and search results (Part B)
- Parses JSON response into RevenueGeoTileResponse model

Handles:
- API errors and retries
- JSON parsing and validation
- Fallback to safe GREEN response if parsing fails
"""

import json
import logging
import os
import re
from typing import Optional
from datetime import datetime, timedelta
from groq import Groq
from models.revenue_geo_models import RevenueGeoTileResponse

logger = logging.getLogger(__name__)


class GroqRevenueAgentService:
    """
    Manages Groq LLM calls for revenue geopolitical analysis.
    """

    def __init__(self, api_key: str = None):
        """
        Initialize Groq client.
        
        Args:
            api_key: Groq API key. If None, read from GROQ_API_KEY env var.
        """
        self.api_key = api_key or os.getenv("GROQ_API_KEY")
        if not self.api_key:
            raise ValueError("GROQ_API_KEY not provided and not found in environment")
        
        self.client = Groq(api_key=self.api_key)
        primary_model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
        self.models = [primary_model, "mixtral-8x7b-32768"]

    async def analyze_revenue_impact(
        self,
        system_instruction: str,
        task_prompt: str
    ) -> Optional[RevenueGeoTileResponse]:
        """
        Call Groq API with system instruction + task prompt.
        Parse response JSON into RevenueGeoTileResponse model.
        
        Args:
            system_instruction: Part A of prompt (role, constraints, methodology)
            task_prompt: Part B of prompt (current forecast data + search results)
            
        Returns:
            RevenueGeoTileResponse or None if parsing fails
        """
        messages = [
            {"role": "system", "content": system_instruction},
            {"role": "user", "content": task_prompt},
        ]

        last_error = None
        for model in self.models:
            try:
                logger.info("Calling Groq API with model %s", model)
                response = self.client.chat.completions.create(
                    model=model,
                    messages=messages,
                    temperature=0.2,
                    max_tokens=4096,
                    top_p=1.0
                )
                response_text = (response.choices[0].message.content or "").strip()
                if not response_text:
                    logger.warning("Groq returned an empty response for model %s", model)
                    continue

                logger.info("Groq response received: %s characters", len(response_text))
                tile_response = self._parse_response_json(response_text)
                if tile_response:
                    logger.info("Successfully parsed Groq response using model %s", model)
                    return tile_response
                logger.error("Failed to parse Groq response JSON for model %s", model)
            except Exception as exc:
                last_error = exc
                logger.error("Groq API error with model %s: %s", model, exc)

        if last_error:
            logger.error("Groq analysis failed for all configured models: %s", last_error)
        return None

    def _parse_response_json(self, response_text: str) -> Optional[RevenueGeoTileResponse]:
        """
        Extract and parse JSON from Groq response.
        
        Handles cases where Groq wraps JSON in markdown code blocks.
        
        Args:
            response_text: Raw response from Groq
            
        Returns:
            Parsed RevenueGeoTileResponse or None if parsing fails
        """
        try:
            # Try direct parsing first
            try:
                data = json.loads(response_text)
            except json.JSONDecodeError:
                # Try extracting from markdown code block
                match = re.search(r'```(?:json)?\s*(.*?)\s*```', response_text, re.DOTALL)
                if match:
                    data = json.loads(match.group(1))
                else:
                    # Try finding JSON object in response
                    match = re.search(r'\{.*\}', response_text, re.DOTALL)
                    if match:
                        data = json.loads(match.group(0))
                    else:
                        logger.error("Could not find JSON in Groq response")
                        return None

            # Validate against Pydantic model
            tile_response = RevenueGeoTileResponse(**data)
            return tile_response

        except json.JSONDecodeError as e:
            logger.error(f"JSON parsing error: {e}")
            return None
        except Exception as e:
            logger.error(f"Pydantic validation error: {e}")
            return None

    def create_safe_green_response(
        self,
        baseline_revenue_usd_mn: float,
        baseline_revenue_lkr_mn: float,
        baseline_arrivals: int,
        avg_spend_per_tourist_usd: float,
        avg_length_of_stay: float,
        usd_lkr_rate: float,
        current_month: str,
        current_year: int,
        trigger_type: str = "INITIAL_LOAD"
    ) -> RevenueGeoTileResponse:
        """
        Create a safe GREEN (no risk) response when analysis cannot be completed.
        
        Used as fallback when Groq API unavailable or response parsing fails.
        
        Returns:
            RevenueGeoTileResponse with GREEN severity and 0% adjustment
        """
        now = datetime.utcnow()
        cache_expires = now + timedelta(hours=6)

        return RevenueGeoTileResponse(
            tile_type="GEOPOLITICAL_REVENUE_ADJUSTMENT",
            generated_at=now.isoformat() + "Z",
            forecast_month=f"{current_month} {current_year}",
            situation_summary={
                "headline": "No material geopolitical revenue disruption confirmed for this period.",
                "severity_level": "GREEN",
                "severity_rationale": "No confirmed geopolitical signals with material revenue impact detected.",
                "search_scope_note": "Fallback response: real-time analysis unavailable.",
                "active_signals": []
            },
            adjustment={
                "baseline_revenue_usd_mn": baseline_revenue_usd_mn,
                "baseline_revenue_lkr_mn": baseline_revenue_lkr_mn,
                "adjustment_percentage": 0.0,
                "adjusted_revenue_usd_mn": baseline_revenue_usd_mn,
                "adjusted_revenue_lkr_mn": baseline_revenue_lkr_mn,
                "monthly_revenue_at_risk_usd_mn": 0.0,
                "weekly_revenue_at_risk_usd_mn": 0.0,
                "monthly_revenue_at_risk_lkr_mn": 0.0,
                "adjusted_revenue_usd_mn_lower_bound": baseline_revenue_usd_mn * 0.93,
                "adjusted_revenue_usd_mn_upper_bound": baseline_revenue_usd_mn * 1.07,
                "adjustment_basis": "Fallback response with no signals applied."
            },
            tile_display={
                "primary_label": "Situation-Adjusted Revenue Forecast",
                "primary_value": f"${baseline_revenue_usd_mn:.2f}M",
                "secondary_value": f"LKR {baseline_revenue_lkr_mn:,.0f}M",
                "delta_label": "vs. Baseline",
                "delta_value": "0.0%",
                "delta_direction": "NEUTRAL",
                "risk_label": "Revenue at Risk",
                "risk_value": "$0.00M / month",
                "weekly_risk_label": "Weekly Risk",
                "weekly_risk_value": "$0.00M / week",
                "confidence_range_label": "Estimated Range",
                "confidence_range_value": f"${baseline_revenue_usd_mn * 0.93:.2f}M - ${baseline_revenue_usd_mn * 1.07:.2f}M",
                "situation_badge": "GREEN",
                "situation_badge_text": "Stable",
                "data_freshness_label": "Updated today",
                "staleness_warning": None,
                "tooltip_summary": "Analysis currently unavailable. Using baseline forecast with no geopolitical adjustments."
            },
            suggestions=[
                "Monitor emerging geopolitical developments in source markets and transit routes.",
                "Track airline fuel costs and airfare trends affecting tourist access.",
                "Review travel advisory updates for UK, EU, and Middle East markets."
            ],
            data_quality={
                "search_freshness": datetime.utcnow().date().isoformat(),
                "signal_count_evaluated": 0,
                "signal_count_applied": 0,
                "signal_count_unconfirmed": 0,
                "domains_with_results": [],
                "domains_with_no_results": [],
                "data_gaps": ["Real-time analysis unavailable", "Using fallback safe response"],
                "confidence_note": "Fallback mode active. Zero risk assumption until full analysis available."
            },
            cache_metadata={
                "cached_at": now.isoformat() + "Z",
                "cache_expires_at": cache_expires.isoformat() + "Z",
                "trigger_type": trigger_type,
                "next_scheduled_refresh": (now + timedelta(hours=6)).date().isoformat()
            }
        )
