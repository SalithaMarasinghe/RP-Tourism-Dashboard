import math
from datetime import date
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
import pandas as pd

from services.rev_data_service import RevenueDataService, get_revenue_data_service
from models.revenue import MonthlyRevenueRecord, AnnualRevenueRecord

router = APIRouter(
    prefix="/rev",
    tags=["Revenue Intelligence"]
)

# Define outer response models for Swagger documentation
class RevenueMetadata(BaseModel):
    scenario: str = Field(description="The forecast scenario requested")
    start_year: int = Field(description="The logical start year of the returned dataset")
    end_year: int = Field(description="The logical end year of the returned dataset")
    forecast_start: int = Field(default=2026, description="The year where forecast logic begins")

class RevenueKpiResponse(BaseModel):
    monthly: List[MonthlyRevenueRecord]
    annual: List[AnnualRevenueRecord]
    meta: RevenueMetadata

class RevenueSummaryResponse(BaseModel):
    year: int = Field(..., description="The requested year")
    scenario: str = Field(..., description="The scenario used for the summary")
    total_revenue_usd_bn: Optional[float] = Field(None, description="Total annual revenue in USD Billions")
    total_revenue_lkr_bn: Optional[float] = Field(None, description="Total annual revenue in LKR Billions")
    avg_spend_per_tourist_usd: Optional[float] = Field(None, description="Average Revenue Per Tourist (RPT) in USD")
    avg_spend_per_tourist_day_usd: Optional[float] = Field(None, description="Average Revenue Per Tourist Per Day (RPTD) in USD")
    avg_length_of_stay: Optional[float] = Field(None, description="Average Length of Stay in days")
    total_arrivals: Optional[int] = Field(None, description="Total annual arrivals")
    revenue_yoy_pct: Optional[float] = Field(None, description="Year-over-Year revenue growth percentage")

class EventMarker(BaseModel):
    ds: date = Field(..., description="Date of the event")
    label: str = Field(..., description="Name/Label of the event")
    type: str = Field(default="event", description="Type of marker (e.g. event, shock)")

class AnomalyRecord(BaseModel):
    ds: date = Field(..., description="Date of the detected anomaly")
    metric: str = Field(..., description="The primary metric that triggered the anomaly")
    anomaly_score: float = Field(..., description="Statistical deviation score")
    anomaly_reason: str = Field(..., description="Human-readable reason for the anomaly")

class RevenueAnomaliesResponse(BaseModel):
    events: List[EventMarker]
    anomalies: List[AnomalyRecord]

class RevenueDriver(BaseModel):
    name: str = Field(..., description="Revenue channel name")
    value_usd_mn: Optional[float] = Field(None, description="Revenue value in USD Millions")
    share_pct: Optional[float] = Field(None, description="Percentage share of total revenue")

class RevenueDriversResponse(BaseModel):
    year: int = Field(..., description="The requested year")
    scenario: str = Field(..., description="The scenario used for the driver breakdown")
    total_revenue_usd_mn: Optional[float] = Field(None, description="Total annual revenue for the year in USD Millions")
    drivers: List[RevenueDriver] = Field(..., description="List of revenue channel contributions")

def safe_replace_nan(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """
    Safely serialized pandas dataframe, converting NaN/NaT to None,
    which native FastAPI JSON responses require to render accurately as 'null'.
    """
    # Replace numpy/pandas NaN/Infinity with native python None
    df_clean = df.replace([math.nan, math.inf, -math.inf], None)
    
    # We must explicitly replace any pd.NaT values in datetimes
    for col in df_clean.select_dtypes(include=['datetime', 'datetimetz']).columns:
        df_clean[col] = df_clean[col].apply(lambda x: None if pd.isna(x) else x.isoformat() if hasattr(x, 'isoformat') else x)
        
    return df_clean.to_dict(orient="records")


@router.get("/kpis", response_model=RevenueKpiResponse, summary="Get Revenue KPIs")
async def get_revenue_kpis(
    scenario: Optional[str] = Query("baseline", description="Forecast scenario: baseline, optimistic, or pessimistic"),
    start_year: Optional[int] = Query(None, description="Optional start year filter"),
    end_year: Optional[int] = Query(None, description="Optional end year filter"),
    rev_service: RevenueDataService = Depends(get_revenue_data_service)
):
    """
    Retrieves the canonical combined monthly and annual history and forecast arrays 
    for the Tourism Revenue Intelligence Dashboard.
    """
    # Validate request bounds
    if start_year and end_year and start_year > end_year:
        raise HTTPException(
            status_code=400, 
            detail=f"start_year ({start_year}) cannot be greater than end_year ({end_year})."
        )
        
    valid_scenarios = ["baseline", "optimistic", "pessimistic", "historical"]
    clean_scenario = (scenario or "baseline").strip().lower()
    
    if clean_scenario not in valid_scenarios:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid scenario '{scenario}'. Must be one of {valid_scenarios}."
        )

    try:
        # Get dataframes from the dependency service
        monthly_df = rev_service.get_monthly_data(
            scenario=clean_scenario, 
            start_year=start_year, 
            end_year=end_year
        )
        
        annual_df = rev_service.get_annual_data(
            scenario=clean_scenario, 
            start_year=start_year, 
            end_year=end_year
        )
        
        # We determine the exact logical start and end years returned to inform the frontend
        actual_start_year = int(annual_df['year'].min()) if not annual_df.empty else (start_year or 2013)
        actual_end_year = int(annual_df['year'].max()) if not annual_df.empty else (end_year or 2030)
            
        # Hardcoding the forecast pivot year to 2026 as per our existing dataset bounds, 
        # or we could compute it dynamically by checking where is_forecast=True begins
        forecast_mask = monthly_df[monthly_df['is_forecast']]
        forecast_start_year = int(forecast_mask['year'].min()) if not forecast_mask.empty else 2026

        # Serialize Dataframes natively to Python dictionaries for JSON
        monthly_records = safe_replace_nan(monthly_df)
        annual_records = safe_replace_nan(annual_df)

        return RevenueKpiResponse(
            monthly=monthly_records,
            annual=annual_records,
            meta=RevenueMetadata(
                scenario=clean_scenario,
                start_year=actual_start_year,
                end_year=actual_end_year,
                forecast_start=forecast_start_year
            )
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Internal Server Error processing revenue pipelines: {str(e)}"
        )


@router.get("/summary", response_model=RevenueSummaryResponse, summary="Get Executive Revenue Summary")
async def get_revenue_summary(
    year: int = Query(..., description="The target year for summary"),
    scenario: Optional[str] = Query(None, description="Forecast scenario for years >= 2024"),
    rev_service: RevenueDataService = Depends(get_revenue_data_service)
):
    """
    Returns a high-level executive summary of tourism revenue KPIs for a specific year.
    Useful for headline metric cards.
    """
    valid_scenarios = ["baseline", "optimistic", "pessimistic", "historical"]
    
    # Determine the scenario to use
    # If year is in the past, it should be 'historical'
    # If year is future and scenario is missing, default to baseline
    input_scenario = (scenario or "").strip().lower()
    
    if year < 2024 or input_scenario == 'historical':
        target_scenario = 'historical'
    else:
        # Business logic: default to baseline for future years if none specified
        target_scenario = input_scenario if input_scenario in ["baseline", "optimistic", "pessimistic"] else "baseline"

    # Normalize target_scenario for service layer (keep all scenarios lowercase)
    # The data stores all scenarios in lowercase format
    service_scenario = target_scenario.lower()

    try:
        # Special handling: if requesting historical data for a forecast year (>= 2024),
        # fall back to the most recent historical year instead
        request_year = year
        if service_scenario == "historical" and year >= 2024:
            # Fetch all historical data to find the most recent year
            df_hist_all = rev_service.get_annual_data(scenario="historical")
            if not df_hist_all.empty:
                df_hist_filtered = df_hist_all[df_hist_all['scenario'].astype(str).str.lower() == "historical"]
                if not df_hist_filtered.empty:
                    request_year = int(df_hist_filtered['year'].max())
                    print(f"[DEBUG] Requested historical data for year {year} (forecast year), using most recent historical year: {request_year}")

        # Fetch annual data for the exact year and scenario
        df_ann = rev_service.get_annual_data(
            scenario=service_scenario,
            start_year=request_year,
            end_year=request_year
        )
        
        if df_ann.empty:
            raise HTTPException(
                status_code=404,
                detail=f"No revenue data found for year {request_year} and scenario '{target_scenario}'."
            )
            
        # Try finding the exact scenario first - use case-insensitive comparison
        row_mask = (df_ann['year'] == request_year)
        if service_scenario == "historical":
            # If historical requested, we match specifically (case-insensitive)
            row_mask &= (df_ann['scenario'].astype(str).str.lower() == "historical")
        else:
            # If forecast scenario requested, try to find it (case-insensitive)
            row_mask &= (df_ann['scenario'].astype(str).str.lower() == service_scenario)
            
        final_row = df_ann[row_mask]
        
        # Fallback: if forecast scenario requested but not found (e.g. for a historical year),
        # try to return the 'historical' row for that year instead (case-insensitive).
        if final_row.empty and service_scenario != "historical":
             row_mask_fallback = (df_ann['year'] == request_year) & (df_ann['scenario'].astype(str).str.lower() == "historical")
             final_row = df_ann[row_mask_fallback]
        
        if final_row.empty:
             raise HTTPException(
                status_code=404,
                detail=f"No data matching year {request_year} (scenario '{service_scenario}' or 'historical') was found."
            )
            
        row = final_row.iloc[0]
        
        def safe_float(val):
            if pd.isna(val) or val is None:
                return None
            return float(val)

        def safe_int(val):
            if pd.isna(val) or val is None:
                return None
            return int(val)

        return RevenueSummaryResponse(
            year=int(row['year']),
            scenario=row['scenario'],
            total_revenue_usd_bn=safe_float(row['revenue_usd_bn']),
            total_revenue_lkr_bn=safe_float(row['revenue_lkr_bn']),
            avg_spend_per_tourist_usd=safe_float(row['avg_rpt_usd']),
            avg_spend_per_tourist_day_usd=safe_float(row['avg_rptd_usd']),
            avg_length_of_stay=safe_float(row['avg_los']),
            total_arrivals=safe_int(row['total_arrivals']),
            revenue_yoy_pct=safe_float(row['rev_yoy_pct'])
        )

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving revenue summary: {str(e)}"
        )


@router.get("/anomalies", response_model=RevenueAnomaliesResponse, summary="Get Revenue Anomalies and Events")
async def get_revenue_anomalies(
    metric: str = Query("revenue_usd_mn", description="The metric to focus on for anomalies"),
    scenario: Optional[str] = Query("baseline", description="Forecast scenario to use for reference"),
    start_year: Optional[int] = Query(None, description="Optional start year filter"),
    end_year: Optional[int] = Query(None, description="Optional end year filter"),
    rev_service: RevenueDataService = Depends(get_revenue_data_service)
):
    """
    Returns a unified list of specialized event markers (e.g. Easter attacks) 
    and statistical anomalies detected in the historical timeline.
    """
    try:
        # Fetch monthly data (historical included by default)
        df_monthly = rev_service.get_monthly_data(
            scenario=scenario,
            start_year=start_year,
            end_year=end_year
        )
        
        if df_monthly.empty:
            return RevenueAnomaliesResponse(events=[], anomalies=[])
            
        # Per requirements, we primarily focus on historical rows for anomalies
        df_hist = df_monthly[df_monthly['is_forecast'] == False].copy()
        
        # 1. Extract Events (Rows with a defined event_flag)
        events_df = df_hist[df_hist['event_flag'].notna()]
        event_markers = []
        for _, row in events_df.iterrows():
            event_markers.append(EventMarker(
                ds=row['ds'],
                label=row['event_flag'],
                type="event"
            ))
            
        # 2. Extract Statistical Anomalies (Rows with anomaly_score > 0)
        # We also filter for rows where 'anomaly_reason' contains the requested metric 
        # to make it specifically relevant to the UI chart context
        anomalies_df = df_hist[df_hist['anomaly_score'] > 0]
        anomaly_records = []
        for _, row in anomalies_df.iterrows():
            # If a specific metric was requested, we check if it's part of the reason 
            # or simply return all if it fits the general profile.
            # Usually, the UI wants to show markers on a specific chart line.
            reason_str = str(row['anomaly_reason'])
            if metric.lower() in reason_str.lower() or metric == "all":
                anomaly_records.append(AnomalyRecord(
                    ds=row['ds'],
                    metric=metric if metric != "all" else "multiple",
                    anomaly_score=float(row['anomaly_score']),
                    anomaly_reason=reason_str
                ))
            # Also include if it's a very high score even if metric name isn't a direct substring 
            # (fallback for general anomalies)
            elif float(row['anomaly_score']) > 5.0:
                 anomaly_records.append(AnomalyRecord(
                    ds=row['ds'],
                    metric="general",
                    anomaly_score=float(row['anomaly_score']),
                    anomaly_reason=reason_str
                ))

        return RevenueAnomaliesResponse(
            events=event_markers,
            anomalies=anomaly_records
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving revenue anomalies: {str(e)}"
        )


@router.get("/drivers", response_model=RevenueDriversResponse, summary="Get Revenue Drivers Breakdown")
async def get_revenue_drivers_breakdown(
    year: int = Query(..., description="The target year for driver breakdown"),
    scenario: Optional[str] = Query(None, description="Forecast scenario for years >= 2024"),
    rev_service: RevenueDataService = Depends(get_revenue_data_service)
):
    """
    Returns the contribution breakdown of tourism revenue by channel 
    (Hotels, Travel Agencies, etc.) for a specific forecast year and scenario.
    """
    valid_scenarios = ["baseline", "optimistic", "pessimistic", "historical"]
    clean_scenario = (scenario or "baseline").strip().lower()
    
    if clean_scenario == 'historical':
        raise HTTPException(
            status_code=400,
            detail="Driver breakdown is only available for forecast scenarios."
        )

    if clean_scenario not in valid_scenarios:
         raise HTTPException(
            status_code=400,
            detail=f"Invalid scenario '{scenario}'. Must be one of {valid_scenarios}."
        )

    try:
        # get_revenue_drivers handles scenario defaulting and year filtering
        drivers_data = rev_service.get_revenue_drivers(year=year, scenario=clean_scenario)
        
        if not drivers_data:
            raise HTTPException(
                status_code=404,
                detail=f"No revenue driver data found for year {year}. Channel breakdowns are typically available for forecast years (>=2024)."
            )
            
        return RevenueDriversResponse(**drivers_data)

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving revenue drivers: {str(e)}"
        )



