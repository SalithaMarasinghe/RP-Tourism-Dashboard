"""Pydantic models for Feature Card 3: Demographic Cohort Tracker."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field, model_validator


class DemographicModel(BaseModel):
    """Base model with strict defaults for API payload safety."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)


class AnnualDemographicRecord(DemographicModel):
    """Canonical annual demographic record."""

    report_year: int = Field(..., ge=1900, le=3000, description="Reporting year.")
    gender_male: int = Field(..., ge=0, description="Male arrivals count.")
    gender_female: int = Field(..., ge=0, description="Female arrivals count.")

    age_below_10: int = Field(..., ge=0, description="Arrivals aged below 10.")
    age_10_19: int = Field(..., ge=0, description="Arrivals aged 10-19.")
    age_20_29: int = Field(..., ge=0, description="Arrivals aged 20-29.")
    age_30_39: int = Field(..., ge=0, description="Arrivals aged 30-39.")
    age_40_49: int = Field(..., ge=0, description="Arrivals aged 40-49.")
    age_50_59: int = Field(..., ge=0, description="Arrivals aged 50-59.")
    age_60_plus: int = Field(..., ge=0, description="Arrivals aged 60+.")

    purpose_leisure: int = Field(..., ge=0, description="Leisure-purpose arrivals.")
    purpose_business: int = Field(..., ge=0, description="Business-purpose arrivals.")
    purpose_vfr: int = Field(
        ..., ge=0, description="Visiting friends and relatives purpose arrivals."
    )
    purpose_transit: int = Field(..., ge=0, description="Transit-purpose arrivals.")
    purpose_other: int = Field(..., ge=0, description="Other-purpose arrivals.")

    top_source_markets: list[str] = Field(
        default_factory=list,
        description="Top source market names ordered by contribution.",
    )
    note: str | None = Field(default=None, description="Optional analyst note.")


class DemographicKPIResponse(DemographicModel):
    """KPI card payload for demographic summary endpoints."""

    report_year: int = Field(..., ge=1900, le=3000)
    total_arrivals: int = Field(..., ge=0, description="Total arrivals in the year.")
    male_share_pct: float = Field(..., ge=0, le=100, description="Male share percentage.")
    female_share_pct: float = Field(..., ge=0, le=100, description="Female share percentage.")
    dominant_age_cohort: str = Field(
        ..., description="Age cohort with the largest share."
    )
    dominant_purpose: str = Field(..., description="Purpose category with largest share.")
    yoy_growth_pct: float | None = Field(
        default=None, description="Year-over-year total arrivals growth percentage."
    )


class DemographicTrendPoint(DemographicModel):
    """Single point in a demographic trend series."""

    report_year: int = Field(..., ge=1900, le=3000)
    metric: str = Field(
        ..., description="Metric identifier, e.g. 'age_20_29' or 'purpose_leisure'."
    )
    value: float = Field(..., ge=0, description="Metric value at report_year.")


class PopulationPyramidResponse(DemographicModel):
    """Population pyramid payload for one year."""

    report_year: int = Field(..., ge=1900, le=3000)
    age_groups: list[str] = Field(..., min_length=1, description="Ordered age bands.")
    male_values: list[int] = Field(
        ..., min_length=1, description="Male values aligned to age_groups."
    )
    female_values: list[int] = Field(
        ..., min_length=1, description="Female values aligned to age_groups."
    )

    @model_validator(mode="after")
    def validate_lengths(self) -> "PopulationPyramidResponse":
        """Ensure age_groups, male_values, and female_values are aligned."""
        size = len(self.age_groups)
        if len(self.male_values) != size or len(self.female_values) != size:
            raise ValueError(
                "age_groups, male_values, and female_values must have equal lengths"
            )
        return self


class HeatmapCell(DemographicModel):
    """Cell payload for cohort heatmap visualizations."""

    report_year: int = Field(..., ge=1900, le=3000)
    row_key: str = Field(..., description="Row dimension key.")
    column_key: str = Field(..., description="Column dimension key.")
    value: float = Field(..., ge=0, description="Cell intensity value.")


class RisingSegmentAlert(DemographicModel):
    """Alert for segments with notable upward movement."""

    segment: str = Field(..., description="Segment identifier.")
    report_year: int = Field(..., ge=1900, le=3000)
    current_value: float = Field(..., ge=0)
    previous_value: float | None = Field(default=None, ge=0)
    growth_pct: float = Field(..., description="Computed growth percentage.")
    severity: str = Field(..., description="Severity label, e.g. INFO/WARN/HIGH.")
    message: str = Field(..., description="Human-readable alert text.")


class SourceMarketTrend(DemographicModel):
    """Trend payload for one source market."""

    source_market: str = Field(..., description="Source market name.")
    points: list[DemographicTrendPoint] = Field(default_factory=list)
    latest_value: float | None = Field(default=None, ge=0)
    yoy_growth_pct: float | None = Field(default=None)


class AnnualDemographicRecordsResponse(DemographicModel):
    """Wrapper for annual demographic records endpoint."""

    records: list[AnnualDemographicRecord] = Field(default_factory=list)


class DemographicKPIsResponse(DemographicModel):
    """Wrapper for demographic KPI endpoint."""

    kpis: list[DemographicKPIResponse] = Field(default_factory=list)


class DemographicTrendResponse(DemographicModel):
    """Wrapper for demographic trend endpoint."""

    points: list[DemographicTrendPoint] = Field(default_factory=list)


class PopulationPyramidListResponse(DemographicModel):
    """Wrapper for population pyramid endpoint."""

    pyramids: list[PopulationPyramidResponse] = Field(default_factory=list)


class HeatmapResponse(DemographicModel):
    """Wrapper for heatmap endpoint."""

    cells: list[HeatmapCell] = Field(default_factory=list)


class RisingSegmentAlertsResponse(DemographicModel):
    """Wrapper for rising segment alerts endpoint."""

    alerts: list[RisingSegmentAlert] = Field(default_factory=list)


class SourceMarketTrendsResponse(DemographicModel):
    """Wrapper for source market trends endpoint."""

    trends: list[SourceMarketTrend] = Field(default_factory=list)


__all__ = [
    "AnnualDemographicRecord",
    "DemographicKPIResponse",
    "DemographicTrendPoint",
    "PopulationPyramidResponse",
    "HeatmapCell",
    "RisingSegmentAlert",
    "SourceMarketTrend",
    "AnnualDemographicRecordsResponse",
    "DemographicKPIsResponse",
    "DemographicTrendResponse",
    "PopulationPyramidListResponse",
    "HeatmapResponse",
    "RisingSegmentAlertsResponse",
    "SourceMarketTrendsResponse",
]
