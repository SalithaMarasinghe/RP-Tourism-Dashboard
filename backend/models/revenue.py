
from datetime import date
from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict, Field

class MonthlyRevenueRecord(BaseModel):
    """
    Canonical schema for monthly tourism revenue and arrivals data.
    Used by the Tourism Revenue Intelligence Dashboard.
    """
    model_config = ConfigDict(from_attributes=True)

    ds: date = Field(..., description="The date representing the first day of the month")
    year: int = Field(..., description="Calendar year")
    month: int = Field(..., ge=1, le=12, description="Month of the year (1-12)")
    scenario: Literal["baseline", "optimistic", "pessimistic"] | str = Field(..., description="Forecast scenario or actual data")
    is_forecast: bool = Field(..., description="Flag indicating if the record is a future prediction")
    
    # Volume metrics
    arrivals: Optional[int] = Field(default=None, description="Total number of tourist arrivals in the month")
    tourist_nights_mn: Optional[float] = Field(default=None, description="Total tourist nights recorded (in millions)")
    los_days: Optional[float] = Field(default=None, description="Average Length of Stay (in days)")
    
    # Revenue metrics
    revenue_usd_mn: Optional[float] = Field(default=None, description="Monthly tourism revenue in USD Millions")
    revenue_lkr_mn: Optional[float] = Field(default=None, description="Monthly tourism revenue in LKR Millions")
    
    # Derived per-capita metrics
    rpt_usd: Optional[float] = Field(default=None, description="Revenue Per Tourist (RPT) in USD")
    rptd_usd: Optional[float] = Field(default=None, description="Revenue Per Tourist Per Day (RPTD) in USD")
    
    # Exchange rate context
    usd_lkr: Optional[float] = Field(default=None, description="Average USD/LKR exchange rate for the month")
    usd_lkr_lower: Optional[float] = Field(default=None, description="Lower bound for USD/LKR rate (if applicable in forecast)")
    usd_lkr_upper: Optional[float] = Field(default=None, description="Upper bound for USD/LKR rate (if applicable in forecast)")
    
    # Contextual flags
    event_flag: Optional[str] = Field(default=None, description="Known major events impacting the month")
    anomaly_flag: Optional[str] = Field(default=None, description="Statistical anomalies or structural breaks (e.g., 'COVID-19 Onset', 'Easter Bombing')")
    anomaly_score: Optional[float] = Field(default=None, description="Max absolute Z-score of the detected anomaly, if any")
    anomaly_reason: Optional[str] = Field(default=None, description="Granular reason detailing which metric spiked or dropped")


class AnnualRevenueRecord(BaseModel):
    """
    Canonical schema for aggregated annual tourism revenue and arrivals data.
    Used by the Tourism Revenue Intelligence Dashboard.
    """
    model_config = ConfigDict(from_attributes=True)

    year: int = Field(..., description="Calendar year")
    scenario: Literal["baseline", "optimistic", "pessimistic"] | str = Field(..., description="Forecast scenario or actual data")
    is_forecast: bool = Field(..., description="Flag indicating if the record is a future prediction")
    
    # Aggregated Volume metrics
    total_arrivals: Optional[int] = Field(default=None, description="Total number of tourist arrivals in the year")
    tourist_nights_mn: Optional[float] = Field(default=None, description="Total tourist nights recorded in the year (in millions)")
    avg_los: Optional[float] = Field(default=None, description="Weighted average Length of Stay (in days)")
    
    # Aggregated Revenue metrics
    revenue_usd_mn: Optional[float] = Field(default=None, description="Total annual tourism revenue in USD Millions")
    revenue_usd_bn: Optional[float] = Field(default=None, description="Total annual tourism revenue in USD Billions")
    revenue_lkr_mn: Optional[float] = Field(default=None, description="Total annual tourism revenue in LKR Millions")
    revenue_lkr_bn: Optional[float] = Field(default=None, description="Total annual tourism revenue in LKR Billions")
    
    # Aggregated per-capita metrics
    avg_rpt_usd: Optional[float] = Field(default=None, description="Weighted average Revenue Per Tourist (RPT) in USD for the year")
    avg_rptd_usd: Optional[float] = Field(default=None, description="Weighted average Revenue Per Tourist Per Day (RPTD) in USD for the year")
    
    # Annual context metrics
    avg_usd_lkr: Optional[float] = Field(default=None, description="Weighted average USD/LKR exchange rate for the year")
    rev_yoy_pct: Optional[float] = Field(default=None, description="Year-over-Year (YoY) percentage change in USD Revenue")
