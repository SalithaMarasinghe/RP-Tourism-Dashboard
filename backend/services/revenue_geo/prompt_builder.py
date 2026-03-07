"""
prompt_builder.py
~~~~~~~~~~~~~~~~~
Prompt template loading and variable injection for Geopolitical Revenue Analyzer.

Loads revenue_geo_agent_prompt.txt from /backend/prompts/ and provides:
- Part A: System instruction
- Part B: Dashboard task prompt with variable placeholders

Handles template variable replacement before sending to Groq API.
"""

import re
from pathlib import Path
from typing import Dict, Any


class PromptBuilder:
    """
    Loads and injects variables into the revenue geopolitical agent prompt.
    """

    def __init__(self):
        """Initialize by loading the prompt file."""
        self.prompt_path = Path(__file__).parent.parent / "prompts" / "revenue_geo_agent_prompt.txt"
        self._load_prompt()

    def _load_prompt(self) -> None:
        """Load the entire prompt file and split into Part A and Part B."""
        if not self.prompt_path.exists():
            raise FileNotFoundError(f"Prompt file not found: {self.prompt_path}")

        with open(self.prompt_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Split on PART B marker
        part_b_marker = "PART B — DASHBOARD TILE TASK PROMPT"
        if part_b_marker in content:
            parts = content.split(part_b_marker)
            self.part_a = parts[0] + "PART A — SYSTEM INSTRUCTION"  # Keep PART A label
            self.part_b = part_b_marker + parts[1]
        else:
            # If marker not found, assume entire content is used as system instruction
            self.part_a = content
            self.part_b = ""

    def inject_variables(
        self,
        baseline_revenue_usd_mn: float,
        baseline_revenue_lkr_mn: float,
        baseline_arrivals: int,
        avg_spend_per_tourist_usd: float,
        avg_length_of_stay: float,
        usd_lkr_rate: float,
        current_month: str,
        current_year: int,
        current_date: str,  # ISO date format YYYY-MM-DD
        current_time: str,  # ISO time format HH:MM:SSZ
        day_of_week: str,   # e.g., "Monday"
        trigger_type: str,  # SCHEDULED, MANUAL_OVERRIDE, INITIAL_LOAD, etc.
        model_confidence: float = 0.85,
        search_results: str = ""  # Aggregated search results formatted as JSON or text
    ) -> tuple[str, str]:
        """
        Inject baseline forecast values and search results into prompt template.

        Returns:
            Tuple of (system_instruction, task_prompt) with all variables replaced.
        """
        variables = {
            "BASELINE_REVENUE_USD_MN": str(baseline_revenue_usd_mn),
            "BASELINE_REVENUE_LKR_MN": str(baseline_revenue_lkr_mn),
            "BASELINE_ARRIVALS": str(baseline_arrivals),
            "AVG_SPEND_PER_TOURIST_USD": str(avg_spend_per_tourist_usd),
            "AVG_LENGTH_OF_STAY": str(avg_length_of_stay),
            "USD_LKR_RATE": str(usd_lkr_rate),
            "CURRENT_MONTH": str(current_month),
            "CURRENT_YEAR": str(current_year),
            "CURRENT_DATE": current_date,
            "CURRENT_TIME": current_time,
            "DAY_OF_WEEK": day_of_week,
            "TRIGGER_TYPE": trigger_type,
            "MODEL_CONFIDENCE": str(model_confidence),
            "SEARCH_RESULTS_PLACEHOLDER": search_results,
        }

        # Inject into Part A (system instruction)
        part_a_injected = self._replace_variables(self.part_a, variables)

        # Inject into Part B (task prompt)
        part_b_injected = self._replace_variables(self.part_b, variables)

        return part_a_injected, part_b_injected

    def _replace_variables(self, text: str, variables: Dict[str, str]) -> str:
        """
        Replace {{ VARIABLE }} patterns with corresponding values.
        """
        for key, value in variables.items():
            pattern = r"\{\{\s*" + re.escape(key) + r"\s*\}\}"
            text = re.sub(pattern, value, text)
        return text

    def get_combined_prompt(
        self,
        baseline_revenue_usd_mn: float,
        baseline_revenue_lkr_mn: float,
        baseline_arrivals: int,
        avg_spend_per_tourist_usd: float,
        avg_length_of_stay: float,
        usd_lkr_rate: float,
        current_month: str,
        current_year: int,
        current_date: str,
        current_time: str,
        day_of_week: str,
        trigger_type: str,
        model_confidence: float = 0.85,
        search_results: str = ""
    ) -> str:
        """
        Get the complete combined prompt for Groq.
        
        Returns:
            Combined prompt with Part A + Part B, all variables injected.
        """
        part_a, part_b = self.inject_variables(
            baseline_revenue_usd_mn=baseline_revenue_usd_mn,
            baseline_revenue_lkr_mn=baseline_revenue_lkr_mn,
            baseline_arrivals=baseline_arrivals,
            avg_spend_per_tourist_usd=avg_spend_per_tourist_usd,
            avg_length_of_stay=avg_length_of_stay,
            usd_lkr_rate=usd_lkr_rate,
            current_month=current_month,
            current_year=current_year,
            current_date=current_date,
            current_time=current_time,
            day_of_week=day_of_week,
            trigger_type=trigger_type,
            model_confidence=model_confidence,
            search_results=search_results
        )
        return part_a + "\n\n" + part_b
