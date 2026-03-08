"""Central demographic data service for Feature Card 3.

This service orchestrates demographic data loading, transformation, trend
enrichment, alerts, and source-market analytics behind a single dependency-
injection-friendly class for FastAPI routers.
"""

from __future__ import annotations

from pathlib import Path
from threading import RLock
from typing import Any

import pandas as pd
from pandas import DataFrame


AGE_COLUMNS: tuple[str, ...] = (
    "age_below_10",
    "age_10_19",
    "age_20_29",
    "age_30_39",
    "age_40_49",
    "age_50_59",
    "age_60_plus",
)

GENDER_COLUMNS: tuple[str, ...] = ("gender_male", "gender_female")

PURPOSE_COLUMNS: tuple[str, ...] = (
    "purpose_leisure",
    "purpose_business",
    "purpose_vfr",
    "purpose_transit",
    "purpose_other",
)


class DemographicDataService:
    """Facade service for demographic cohort tracker operations."""

    def __init__(self, csv_path: str | Path | None = None, enable_cache: bool = True) -> None:
        self._csv_path = Path(csv_path) if csv_path is not None else None
        self._enable_cache = enable_cache
        self._lock = RLock()

        self._is_loaded: bool = False
        self._raw_df: DataFrame | None = None
        self._canonical_df: DataFrame | None = None
        self._trend_df: DataFrame | None = None
        self._alerts_df: DataFrame | None = None
        self._source_market_analytics: dict[str, DataFrame] | None = None

    # -------------------------------------------------------------------------
    # Internal orchestration
    # -------------------------------------------------------------------------
    def _import_dependencies(self) -> dict[str, Any]:
        """Lazily import dependent services with explicit error context."""
        try:
            from app.services.demographic.demo_data_loader import load_demographic_csv
            from app.services.demographic.demo_transform_service import transform_demographic_annual
            from app.services.demographic.demo_metrics_service import build_demographic_trend_metrics
            from app.services.demographic.demo_alert_service import build_rising_segment_alerts
            from app.services.demographic.demo_source_market_service import (
                build_source_market_analytics,
            )
            from app.services.demographic.demo_pyramid_service import (
                prepare_population_pyramid_payload,
            )
        except ModuleNotFoundError as exc:
            raise RuntimeError(
                "Required demographic service module is missing. "
                "Ensure loader/transform/metrics/alert/source-market/pyramid services exist."
            ) from exc

        return {
            "load_demographic_csv": load_demographic_csv,
            "transform_demographic_annual": transform_demographic_annual,
            "build_demographic_trend_metrics": build_demographic_trend_metrics,
            "build_rising_segment_alerts": build_rising_segment_alerts,
            "build_source_market_analytics": build_source_market_analytics,
            "prepare_population_pyramid_payload": prepare_population_pyramid_payload,
        }

    def _load_pipeline(self, force_refresh: bool = False) -> None:
        """Execute full demographic pipeline and cache the resulting datasets."""
        with self._lock:
            if self._enable_cache and self._is_loaded and not force_refresh:
                return

            deps = self._import_dependencies()

            loader = deps["load_demographic_csv"]
            transformer = deps["transform_demographic_annual"]
            trend_builder = deps["build_demographic_trend_metrics"]
            alert_builder = deps["build_rising_segment_alerts"]
            source_builder = deps["build_source_market_analytics"]

            raw_df = loader(self._csv_path) if self._csv_path is not None else loader()
            canonical_df = transformer(raw_df)
            trend_df = trend_builder(canonical_df)
            alerts_df = alert_builder(trend_df)
            source_analytics = source_builder(canonical_df)

            self._raw_df = raw_df
            self._canonical_df = canonical_df
            self._trend_df = trend_df
            self._alerts_df = alerts_df
            self._source_market_analytics = source_analytics
            self._is_loaded = True

    def _ensure_loaded(self) -> None:
        """Ensure datasets are loaded into memory."""
        self._load_pipeline(force_refresh=False)

    def refresh(self) -> None:
        """Force refresh and rebuild in-memory datasets."""
        self._load_pipeline(force_refresh=True)

    def invalidate_cache(self) -> None:
        """Clear all in-memory datasets."""
        with self._lock:
            self._raw_df = None
            self._canonical_df = None
            self._trend_df = None
            self._alerts_df = None
            self._source_market_analytics = None
            self._is_loaded = False

    # -------------------------------------------------------------------------
    # Helpers
    # -------------------------------------------------------------------------
    @staticmethod
    def _serialize_records(df: DataFrame) -> list[dict[str, Any]]:
        """Serialize DataFrame to JSON-friendly records with null safety."""
        if df.empty:
            return []
        clean = df.copy()
        clean = clean.where(pd.notna(clean), None)
        return clean.to_dict(orient="records")

    @staticmethod
    def _sum_row(row: pd.Series, cols: tuple[str, ...]) -> float:
        """Safe row-wise sum over selected columns."""
        vals = pd.to_numeric(row[list(cols)], errors="coerce")
        return float(vals.sum(skipna=True))

    def _resolve_target_year(self, year: int | None) -> int:
        """Resolve target year (explicit or latest available)."""
        self._ensure_loaded()
        assert self._canonical_df is not None
        years = (
            pd.to_numeric(self._canonical_df["report_year"], errors="coerce")
            .dropna()
            .astype(int)
            .tolist()
        )
        if not years:
            raise ValueError("No demographic years available in canonical dataset.")
        if year is None:
            return max(years)
        if year not in years:
            raise ValueError(f"Year {year} not found in demographic dataset. Available: {sorted(set(years))}")
        return year

    def _build_group_trends(self, columns: tuple[str, ...], group_name: str) -> list[dict[str, Any]]:
        """Build long-form trend payload for a metric group."""
        self._ensure_loaded()
        assert self._trend_df is not None
        out: list[dict[str, Any]] = []

        for _, row in self._trend_df.sort_values("report_year", ascending=True).iterrows():
            report_year = int(row["report_year"])
            for metric in columns:
                out.append(
                    {
                        "group": group_name,
                        "metric": metric,
                        "report_year": report_year,
                        "value": row.get(metric),
                        "share_pct": row.get(f"{metric}_share_pct"),
                        "yoy_pct": row.get(f"{metric}_yoy_pct"),
                        "rolling_3y_avg": row.get(f"{metric}_rolling_3y_avg"),
                    }
                )
        return out

    # -------------------------------------------------------------------------
    # Public API methods
    # -------------------------------------------------------------------------
    def get_kpis(self, year: int | None = None) -> dict[str, Any]:
        """Return KPI snapshot for one year (latest by default)."""
        self._ensure_loaded()
        assert self._canonical_df is not None

        target_year = self._resolve_target_year(year)
        year_df = self._canonical_df[self._canonical_df["report_year"] == target_year]
        if year_df.empty:
            raise ValueError(f"No canonical demographic row found for year {target_year}.")

        row = year_df.iloc[-1]
        total_arrivals = self._sum_row(row, AGE_COLUMNS)

        male = float(pd.to_numeric(row.get("gender_male"), errors="coerce") or 0.0)
        female = float(pd.to_numeric(row.get("gender_female"), errors="coerce") or 0.0)
        gender_total = male + female
        male_share = (male / gender_total * 100.0) if gender_total > 0 else None
        female_share = (female / gender_total * 100.0) if gender_total > 0 else None

        prev_df = self._canonical_df[self._canonical_df["report_year"] == (target_year - 1)]
        yoy_growth_pct: float | None = None
        if not prev_df.empty:
            prev_total = self._sum_row(prev_df.iloc[-1], AGE_COLUMNS)
            if prev_total > 0:
                yoy_growth_pct = round(((total_arrivals - prev_total) / prev_total) * 100.0, 4)

        return {
            "report_year": target_year,
            "total_arrivals": int(round(total_arrivals)),
            "male_share_pct": round(male_share, 4) if male_share is not None else None,
            "female_share_pct": round(female_share, 4) if female_share is not None else None,
            "dominant_age_cohort": row.get("dominant_age_cohort"),
            "dominant_purpose": row.get("dominant_purpose"),
            "yoy_growth_pct": yoy_growth_pct,
            "source_market_count": row.get("source_market_count"),
            "note": row.get("note"),
        }

    def get_age_trends(self) -> list[dict[str, Any]]:
        """Return long-form age cohort trends."""
        return self._build_group_trends(AGE_COLUMNS, "age")

    def get_gender_trends(self) -> list[dict[str, Any]]:
        """Return long-form gender trends."""
        return self._build_group_trends(GENDER_COLUMNS, "gender")

    def get_purpose_trends(self) -> list[dict[str, Any]]:
        """Return long-form purpose-of-visit trends."""
        return self._build_group_trends(PURPOSE_COLUMNS, "purpose")

    def get_population_pyramid(self, year: int) -> dict[str, Any]:
        """Return population pyramid payload for selected year."""
        self._ensure_loaded()
        assert self._canonical_df is not None
        target_year = self._resolve_target_year(year)

        deps = self._import_dependencies()
        pyramid_builder = deps["prepare_population_pyramid_payload"]
        return pyramid_builder(self._canonical_df, target_year)

    def get_heatmap_data(self, metric_group: str) -> list[dict[str, Any]]:
        """Return heatmap cells for age/gender/purpose/source_market groups."""
        self._ensure_loaded()
        group = metric_group.strip().lower()

        if group == "source_market":
            assert self._source_market_analytics is not None
            heatmap_df = self._source_market_analytics.get("source_market_heatmap", pd.DataFrame())
            if heatmap_df.empty:
                return []
            cells: list[dict[str, Any]] = []
            for market_name, row in heatmap_df.iterrows():
                for year, value in row.items():
                    if pd.isna(value):
                        continue
                    year_int = int(year)
                    cells.append(
                        {
                            "report_year": year_int,
                            "row_key": str(market_name),
                            "column_key": str(year_int),
                            "value": float(value),
                        }
                    )
            return cells

        mapping: dict[str, tuple[str, ...]] = {
            "age": AGE_COLUMNS,
            "gender": GENDER_COLUMNS,
            "purpose": PURPOSE_COLUMNS,
        }
        if group not in mapping:
            raise ValueError("metric_group must be one of: age, gender, purpose, source_market")

        assert self._trend_df is not None
        columns = mapping[group]
        cells: list[dict[str, Any]] = []

        for _, row in self._trend_df.sort_values("report_year", ascending=True).iterrows():
            year = int(row["report_year"])
            for metric in columns:
                share_col = f"{metric}_share_pct"
                value = row.get(share_col)
                if pd.isna(value):
                    continue
                cells.append(
                    {
                        "report_year": year,
                        "row_key": metric,
                        "column_key": str(year),
                        "value": float(value),
                    }
                )
        return cells

    def get_alerts(self, year: int | None = None) -> list[dict[str, Any]]:
        """Return demographic alerts, optionally filtered by report year."""
        self._ensure_loaded()
        assert self._alerts_df is not None
        alerts_df = self._alerts_df.copy()
        if year is not None and "report_year" in alerts_df.columns:
            alerts_df = alerts_df[alerts_df["report_year"] == year]
        return self._serialize_records(alerts_df)

    def get_source_market_trends(self) -> dict[str, Any]:
        """Return source-market rank analytics payload."""
        self._ensure_loaded()
        assert self._source_market_analytics is not None

        yearly_table = self._source_market_analytics.get(
            "yearly_top_market_table", pd.DataFrame()
        )
        frequency = self._source_market_analytics.get(
            "market_presence_frequency", pd.DataFrame()
        )
        heatmap = self._source_market_analytics.get(
            "source_market_heatmap", pd.DataFrame()
        )
        alerts = self._source_market_analytics.get(
            "rising_source_market_alerts", pd.DataFrame()
        )

        heatmap_cells: list[dict[str, Any]] = []
        if isinstance(heatmap, pd.DataFrame) and not heatmap.empty:
            for market_name, row in heatmap.iterrows():
                for year, value in row.items():
                    if pd.isna(value):
                        continue
                    year_int = int(year)
                    heatmap_cells.append(
                        {
                            "report_year": year_int,
                            "row_key": str(market_name),
                            "column_key": str(year_int),
                            "value": float(value),
                        }
                    )

        return {
            "yearly_top_market_table": self._serialize_records(yearly_table),
            "market_presence_frequency": self._serialize_records(frequency),
            "source_market_heatmap_cells": heatmap_cells,
            "rising_source_market_alerts": self._serialize_records(alerts),
        }


_demographic_data_service_singleton: DemographicDataService | None = None


def get_demographic_data_service() -> DemographicDataService:
    """FastAPI dependency provider for DemographicDataService singleton."""
    global _demographic_data_service_singleton
    if _demographic_data_service_singleton is None:
        _demographic_data_service_singleton = DemographicDataService()
    return _demographic_data_service_singleton


__all__ = [
    "DemographicDataService",
    "get_demographic_data_service",
]

