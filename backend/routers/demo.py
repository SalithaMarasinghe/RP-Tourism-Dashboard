"""FastAPI router for Feature Card 3: Demographic Cohort Tracker."""

from __future__ import annotations

import logging
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query

from models.demographic import (
    DemographicKPIResponse,
    DemographicKPIsResponse,
    DemographicTrendPoint,
    DemographicTrendResponse,
    HeatmapCell,
    HeatmapResponse,
    PopulationPyramidListResponse,
    PopulationPyramidResponse,
    RisingSegmentAlert,
    RisingSegmentAlertsResponse,
)
from services.demographic.demo_data_service import (
    DemographicDataService,
    get_demographic_data_service,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/demo", tags=["Demographic Cohort Tracker"])


def _to_http_exception(exc: Exception) -> HTTPException:
    if isinstance(exc, ValueError):
        return HTTPException(status_code=400, detail=str(exc))
    if isinstance(exc, RuntimeError):
        return HTTPException(status_code=503, detail=str(exc))
    logger.exception("Unhandled demographic router error")
    return HTTPException(status_code=500, detail="Demographic service failed to process the request.")


def _safe_int(value: Any, default: int = 0) -> int:
    try:
        if value is None:
            return default
        return int(float(value))
    except (TypeError, ValueError):
        return default


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        if value is None:
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def _normalize_kpi(payload: dict[str, Any]) -> DemographicKPIResponse:
    return DemographicKPIResponse(
        report_year=_safe_int(payload.get("report_year")),
        total_arrivals=max(_safe_int(payload.get("total_arrivals")), 0),
        male_share_pct=max(_safe_float(payload.get("male_share_pct")), 0.0),
        female_share_pct=max(_safe_float(payload.get("female_share_pct")), 0.0),
        dominant_age_cohort=str(payload.get("dominant_age_cohort") or "unknown"),
        dominant_purpose=str(payload.get("dominant_purpose") or "unknown"),
        yoy_growth_pct=(
            _safe_float(payload.get("yoy_growth_pct"))
            if payload.get("yoy_growth_pct") is not None
            else None
        ),
    )


def _normalize_trend_points(rows: list[dict[str, Any]]) -> list[DemographicTrendPoint]:
    points: list[DemographicTrendPoint] = []
    for row in rows:
        year = _safe_int(row.get("report_year"), default=-1)
        metric = str(row.get("metric") or "").strip()
        value = row.get("value")
        if value is None:
            value = row.get("share_pct")
        if year < 0 or not metric:
            continue
        points.append(
            DemographicTrendPoint(
                report_year=year,
                metric=metric,
                value=max(_safe_float(value), 0.0),
            )
        )
    return points


def _normalize_pyramid_payload(payload: dict[str, Any]) -> PopulationPyramidResponse:
    report_year = _safe_int(payload.get("report_year", payload.get("year")))
    age_groups = payload.get("age_groups") or payload.get("age_bands") or payload.get("labels") or []
    male_values = payload.get("male_values") or payload.get("male") or payload.get("male_counts") or []
    female_values = payload.get("female_values") or payload.get("female") or payload.get("female_counts") or []

    return PopulationPyramidResponse(
        report_year=report_year,
        age_groups=[str(x) for x in age_groups],
        male_values=[max(_safe_int(x), 0) for x in male_values],
        female_values=[max(_safe_int(x), 0) for x in female_values],
    )


def _normalize_heatmap_cells(rows: list[dict[str, Any]]) -> list[HeatmapCell]:
    cells: list[HeatmapCell] = []
    for row in rows:
        cells.append(
            HeatmapCell(
                report_year=_safe_int(row.get("report_year")),
                row_key=str(row.get("row_key") or ""),
                column_key=str(row.get("column_key") or ""),
                value=max(_safe_float(row.get("value")), 0.0),
            )
        )
    return cells


def _normalize_alerts(rows: list[dict[str, Any]]) -> list[RisingSegmentAlert]:
    alerts: list[RisingSegmentAlert] = []
    for row in rows:
        segment = row.get("segment")
        if segment is None:
            segment_type = str(row.get("segment_type") or "").strip()
            segment_name = str(row.get("segment_name") or "").strip()
            segment = f"{segment_type}:{segment_name}".strip(":")

        alerts.append(
            RisingSegmentAlert(
                segment=str(segment or "unknown"),
                report_year=_safe_int(row.get("report_year")),
                current_value=max(_safe_float(row.get("current_value", row.get("value", 0.0))), 0.0),
                previous_value=(
                    max(_safe_float(row.get("previous_value")), 0.0)
                    if row.get("previous_value") is not None
                    else None
                ),
                growth_pct=_safe_float(row.get("growth_pct", row.get("change_value", 0.0))),
                severity=str(row.get("severity", row.get("alert_level", "INFO"))),
                message=str(row.get("message", row.get("rationale", ""))),
            )
        )
    return alerts


@router.get("/kpis", response_model=DemographicKPIsResponse)
def get_demo_kpis(
    year: int | None = Query(default=None, ge=1900, le=3000),
    service: DemographicDataService = Depends(get_demographic_data_service),
) -> DemographicKPIsResponse:
    try:
        kpi = service.get_kpis(year=year)
        return DemographicKPIsResponse(kpis=[_normalize_kpi(kpi)])
    except HTTPException:
        raise
    except Exception as exc:
        raise _to_http_exception(exc) from exc


@router.get("/trends", response_model=DemographicTrendResponse)
def get_demo_trends(
    group: Literal["age", "gender", "purpose"] = Query(...),
    service: DemographicDataService = Depends(get_demographic_data_service),
) -> DemographicTrendResponse:
    try:
        if group == "age":
            rows = service.get_age_trends()
        elif group == "gender":
            rows = service.get_gender_trends()
        else:
            rows = service.get_purpose_trends()

        return DemographicTrendResponse(points=_normalize_trend_points(rows))
    except HTTPException:
        raise
    except Exception as exc:
        raise _to_http_exception(exc) from exc


@router.get("/pyramid", response_model=PopulationPyramidListResponse)
def get_demo_pyramid(
    year: int = Query(..., ge=1900, le=3000),
    service: DemographicDataService = Depends(get_demographic_data_service),
) -> PopulationPyramidListResponse:
    try:
        payload = service.get_population_pyramid(year=year)
        return PopulationPyramidListResponse(pyramids=[_normalize_pyramid_payload(payload)])
    except HTTPException:
        raise
    except Exception as exc:
        raise _to_http_exception(exc) from exc


@router.get("/heatmap", response_model=HeatmapResponse)
def get_demo_heatmap(
    group: Literal["age", "gender", "purpose"] = Query(...),
    service: DemographicDataService = Depends(get_demographic_data_service),
) -> HeatmapResponse:
    try:
        cells = service.get_heatmap_data(metric_group=group)
        return HeatmapResponse(cells=_normalize_heatmap_cells(cells))
    except HTTPException:
        raise
    except Exception as exc:
        raise _to_http_exception(exc) from exc


@router.get("/alerts", response_model=RisingSegmentAlertsResponse)
def get_demo_alerts(
    year: int | None = Query(default=None, ge=1900, le=3000),
    service: DemographicDataService = Depends(get_demographic_data_service),
) -> RisingSegmentAlertsResponse:
    try:
        alerts = service.get_alerts(year=year)
        return RisingSegmentAlertsResponse(alerts=_normalize_alerts(alerts))
    except HTTPException:
        raise
    except Exception as exc:
        raise _to_http_exception(exc) from exc

