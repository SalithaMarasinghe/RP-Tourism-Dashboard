"""
revenue_baseline_service.py
~~~~~~~~~~~~~~~~~~~~~~~~~~~
Retrieves baseline revenue forecast values for current month.

Integrates with rev_data_service to fetch:
- Baseline revenue (USD and LKR)
- Baseline arrivals
- Average spend per tourist
- Average length of stay
- Current USD/LKR exchange rate

These values are injected into the prompt for revenue analysis.
"""

import logging
from typing import Dict, Any, Optional
from datetime import datetime
from services.rev_data_service import RevenueDataService

logger = logging.getLogger(__name__)


class RevenueBaselineService:
    """
    Retrieves current month baseline revenue forecast values.
    """

    def __init__(self):
        """Initialize with RevenueDataService."""
        self.rev_service = RevenueDataService()

    def get_current_baseline(self) -> Optional[Dict[str, Any]]:
        """
        Get baseline revenue forecast for the current month.
        
        Returns:
            Dict with baseline_revenue_usd_mn, baseline_revenue_lkr_mn, 
            baseline_arrivals, avg_spend_per_tourist_usd, avg_length_of_stay,
            usd_lkr_rate, current_month, current_year
            
            Or None if unable to retrieve
        """
        try:
            now = datetime.utcnow()
            current_year = now.year
            current_month = now.month
            
            # Get forecast data for current month using 'baseline' scenario
            summary = self.rev_service.get_monthly_summary_forecast(
                year=current_year,
                month=current_month,
                scenario='baseline'
            )

            if not summary:
                logger.warning(f"No forecast data found for {current_year}-{current_month:02d}")
                return self._get_fallback_baseline()

            # Extract baseline values
            baseline_revenue_usd_mn = summary.get("total_revenue_usd_mn", 0.0)
            
            # Get FX rate (assuming it's in the response or use a default)
            usd_lkr_rate = summary.get("usd_lkr_rate", 330.0)  # Default rate
            
            baseline_revenue_lkr_mn = baseline_revenue_usd_mn * usd_lkr_rate

            # Get arrivals and spend metrics
            baseline_arrivals = summary.get("arrivals", 0)
            avg_spend_per_tourist_usd = summary.get("avg_spend_per_tourist_usd", 1500.0)
            avg_length_of_stay = summary.get("avg_length_of_stay", 7.5)

            # Get current month name
            month_name = datetime(current_year, current_month, 1).strftime("%B")

            result = {
                "baseline_revenue_usd_mn": round(baseline_revenue_usd_mn, 2),
                "baseline_revenue_lkr_mn": round(baseline_revenue_lkr_mn, 2),
                "baseline_arrivals": int(baseline_arrivals),
                "avg_spend_per_tourist_usd": round(avg_spend_per_tourist_usd, 2),
                "avg_length_of_stay": round(avg_length_of_stay, 2),
                "usd_lkr_rate": round(usd_lkr_rate, 2),
                "current_month": month_name,
                "current_year": current_year
            }

            logger.info(f"Retrieved baseline for {month_name} {current_year}: ${baseline_revenue_usd_mn:.2f}M USD")
            return result

        except Exception as e:
            logger.error(f"Error retrieving baseline: {e}")
            return self._get_fallback_baseline()

    def _get_fallback_baseline(self) -> Dict[str, Any]:
        """
        Return safe fallback baseline values if primary retrieval fails.
        
        These are reasonable defaults for Sri Lanka tourism.
        """
        now = datetime.utcnow()
        month_name = now.strftime("%B")
        
        logger.warning("Using fallback baseline values")
        
        return {
            "baseline_revenue_usd_mn": 60.0,  # Conservative estimate
            "baseline_revenue_lkr_mn": 19800.0,  # USD 60M × 330 LKR
            "baseline_arrivals": 30000,
            "avg_spend_per_tourist_usd": 1500.0,
            "avg_length_of_stay": 7.5,
            "usd_lkr_rate": 330.0,
            "current_month": month_name,
            "current_year": now.year
        }

    def get_monthly_summary_forecast(
        self,
        year: int,
        month: int,
        scenario: str = 'baseline'
    ) -> Optional[Dict[str, Any]]:
        """
        Get monthly forecast data for a specific month (mainly for testing).
        
        Args:
            year: Year
            month: Month (1-12)
            scenario: Scenario name ('baseline', 'optimistic', 'pessimistic')
            
        Returns:
            Monthly summary or None
        """
        try:
            return self.rev_service.get_monthly_summary_forecast(year, month, scenario)
        except Exception as e:
            logger.error(f"Error getting monthly summary: {e}")
            return None
