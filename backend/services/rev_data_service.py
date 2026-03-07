import pandas as pd
from typing import Optional, Tuple

from services.rev_data_loader import (
    load_revenue_monthly_ml,
    load_revenue_annual_ml,
    load_m1_usdlkr_forecast,
    load_monthly_arrivals_clean,
    load_volume_revenue_clean
)
from services.rev_transforms import transform_monthly_arrivals_wide_to_long
from services.rev_history_builder import reconstruct_historical_monthly_revenue
from services.rev_forecast_builder import build_monthly_revenue_forecast
from services.rev_annual_builder import build_annual_revenue_dataset
from services.rev_event_service import apply_event_flags
from services.rev_anomaly_service import apply_anomaly_detection


class RevenueDataService:
    """
    Production-ready FastAPI service class for the Tourism Revenue Intelligence backend.
    
    This class handles the end-to-end pipeline of loading raw CSV files, orchestrating
    cleanup and transformation functions, merging historical and ML forecast data,
    and returning filtered canonical pandas DataFrames for routing layers.
    
    It caches the final canonical DataFrames in memory to avoid repetitive IO overhead
    on every API request.
    """
    
    def __init__(self):
        # In-memory lazily-loaded caches
        self._monthly_canonical_df: Optional[pd.DataFrame] = None
        self._annual_canonical_df: Optional[pd.DataFrame] = None
        self._rev_monthly_raw: Optional[pd.DataFrame] = None
        
    def _build_caches(self):
        """
        Internal method to load all raw CSVs, apply transformations, and build
        the unified historical + forecast dataframes into memory.
        """
        # Load Raw Data
        df_rev_monthly_ml = load_revenue_monthly_ml()
        self._rev_monthly_raw = df_rev_monthly_ml.copy()
        df_rev_annual_ml = load_revenue_annual_ml()
        df_fx_fcst = load_m1_usdlkr_forecast()
        df_arrivals_wide = load_monthly_arrivals_clean()
        df_vol_rev_hist = load_volume_revenue_clean()
        
        # 1. Monthly Pipeline
        # Transform wide arrivals to long format
        df_arrivals_long = transform_monthly_arrivals_wide_to_long(df_arrivals_wide)
        
        # Reconstruct canonical Historical Monthly DataFrame
        df_hist_monthly = reconstruct_historical_monthly_revenue(df_arrivals_long, df_vol_rev_hist)
        
        # Build canonical Forecast Monthly DataFrame
        df_fcst_monthly = build_monthly_revenue_forecast(df_rev_monthly_ml, df_fx_fcst)
        
        # Combine Monthly
        df_monthly_combined = pd.concat([df_hist_monthly, df_fcst_monthly], ignore_index=True)
        
        # Apply Event and Anomaly Flags across time
        df_events = apply_event_flags(df_monthly_combined)
        
        # Apply strict statistical anomaly scoring dynamically
        self._monthly_canonical_df = apply_anomaly_detection(df_events, threshold=3.0, window=12)
        
        self._monthly_canonical_df.sort_values(by=['year', 'month', 'scenario'], inplace=True)
        self._monthly_canonical_df.reset_index(drop=True, inplace=True)
        
        # 2. Annual Pipeline
        # Build canonical Combined Annual DataFrame (merges history and forecast internally)
        self._annual_canonical_df = build_annual_revenue_dataset(df_vol_rev_hist, df_rev_annual_ml)
        
    def _get_monthly_df(self) -> pd.DataFrame:
        if self._monthly_canonical_df is None:
            self._build_caches()
        return self._monthly_canonical_df

    def _get_annual_df(self) -> pd.DataFrame:
        if self._annual_canonical_df is None:
            self._build_caches()
        return self._annual_canonical_df

    def get_monthly_data(
        self, 
        scenario: Optional[str] = None, 
        start_year: Optional[int] = None, 
        end_year: Optional[int] = None
    ) -> pd.DataFrame:
        """
        Retrieves canonical monthly revenue data.
        Historical data is ALWAYS included regardless of the scenario filter.
        Forecast data is filtered by the requested scenario.
        
        Args:
            scenario (str | None): e.g. "baseline", "optimistic", "pessimistic".
            start_year (int | None): Inclusive start year.
            end_year (int | None): Inclusive end year.
            
        Returns:
            pd.DataFrame: Filtered long-format monthly dataframe.
        """
        df = self._get_monthly_df()
        
        # Filter by scenario (keep historical OR matching forecast scenario)
        if scenario:
            scenario_clean = scenario.strip().lower()
            df = df[(df['scenario'] == 'Historical') | (df['scenario'] == scenario_clean)]
            
        # Filter by year range
        if start_year is not None:
            df = df[df['year'] >= start_year]
        if end_year is not None:
            df = df[df['year'] <= end_year]
            
        return df.copy()

    def get_annual_data(
        self, 
        scenario: Optional[str] = None, 
        start_year: Optional[int] = None, 
        end_year: Optional[int] = None
    ) -> pd.DataFrame:
        """
        Retrieves canonical annual revenue data.
        Historical data is ALWAYS included. Forecast data is filtered by scenario.
        
        Args:
            scenario (str | None): e.g. "baseline", "optimistic", "pessimistic".
            start_year (int | None): Inclusive start year.
            end_year (int | None): Inclusive end year.
            
        Returns:
            pd.DataFrame: Filtered annual dataframe.
        """
        df = self._get_annual_df()
        
        if scenario:
            scenario_clean = scenario.strip().lower()
            df = df[(df['scenario'] == 'Historical') | (df['scenario'] == scenario_clean)]
            
        if start_year is not None:
            df = df[df['year'] >= start_year]
        if end_year is not None:
            df = df[df['year'] <= end_year]
            
        return df.copy()
        
    def get_combined_kpis(
        self,
        scenario: str = "baseline",
        current_year: int = 2024
    ) -> dict:
        """
        Convenience method to extract high-level KPIs for a specific year and scenario.
        Useful for a high-level statistics card.
        
        Args:
            scenario (str): Target forecast scenario.
            current_year (int): The target year to extract KPIs for.
            
        Returns:
            dict: Basic revenue KPIs.
        """
        df_ann = self.get_annual_data(scenario=scenario, start_year=current_year, end_year=current_year)
        
        if df_ann.empty:
            return {}
            
        # Should typically just be 1 row since we filtered essentially to a single year/scenario+hist
        # If it happens to be historical, the scenario matching historical will catch it.
        # Let's take the first row that matches. Since we sort Historical ascending alongside forecast,
        # we can just grab the last record for the year (which might be the forecast if it overlaps, or historical).
        # Assuming one active row per year depending on the cut-over.
        row = df_ann.iloc[-1]
        
        return {
            "avg_rpt_usd": float(row['avg_rpt_usd']),
            "avg_usd_lkr": float(row['avg_usd_lkr']) if pd.notna(row['avg_usd_lkr']) else None
        }

    def get_revenue_drivers(self, year: int, scenario: Optional[str] = None) -> dict:
        """
        Extracts revenue channel contribution for a specific forecast year and scenario.
        
        Args:
            year (int): The target year.
            scenario (str | None): Forecast scenario (baseline, optimistic, pessimistic).
            
        Returns:
            dict: Data matching the RevenueDriversResponse schema.
        """
        if self._rev_monthly_raw is None:
            self._build_caches()
            
        df = self._rev_monthly_raw.copy()
        
        # Standardize scenario names to match the mapping in forecast_builder
        scenario_mapping = {
            'base': 'baseline', 'high': 'optimistic', 'low': 'pessimistic',
            'opt': 'optimistic', 'pess': 'pessimistic'
        }
        df['scenario'] = df['scenario'].astype(str).str.lower().replace(scenario_mapping)
        
        target_scenario = (scenario or "baseline").strip().lower()
        
        # These are the expected columns in revenue_monthly_ml.csv based on research
        driver_cols = {
            "Hotels": "rev_usd_hotels_mn",
            "Travel Agencies": "rev_usd_travel_agencies_mn",
            "Shops": "rev_usd_shops_mn",
            "Banks": "rev_usd_banks_mn",
            "Gem Corp": "rev_usd_gem_corp_mn"
        }
        
        # Ensure all potential revenue columns are numeric before filtering
        numeric_cols = list(driver_cols.values()) + ["forecast_usd_mn", "yhat"]
        for col in numeric_cols:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0.0)
        
        # Filter for year and scenario
        mask = (df['year'] == year) & (df['scenario'] == target_scenario)
        df_year = df[mask]
        
        if df_year.empty:
            return {}
            
        # Sum the columns
        summed = df_year.sum(numeric_only=True)
        
        # Total revenue for the year
        total_rev = summed.get("forecast_usd_mn", 0.0)
        if total_rev == 0:
            total_rev = summed.get("yhat", 0.0)
        
        total_rev = float(total_rev)
        
        drivers = []
        for name, col in driver_cols.items():
            val = summed.get(col, 0.0)
            share = (val / total_rev * 100) if total_rev > 0 else 0.0
            drivers.append({
                "name": name,
                "value_usd_mn": round(float(val), 2),
                "share_pct": round(float(share), 2)
            })
            
        return {
            "year": year,
            "scenario": target_scenario.capitalize(),
            "total_revenue_usd_mn": round(float(total_rev), 2),
            "drivers": drivers
        }

# FastAPI Dependency
def get_revenue_data_service() -> RevenueDataService:
    """
    Dependency injection provider for the FastAPI router.
    In a real-world high-traffic app, you might want to instantiate the service 
    globally (singleton) to keep caches persistent across requests.
    """
    return _revenue_service_singleton

# Singleton instance to persist the dataframe cache across FastAPI requests
_revenue_service_singleton = RevenueDataService()
