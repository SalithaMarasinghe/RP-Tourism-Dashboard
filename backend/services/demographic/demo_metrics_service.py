"""Demographic trend metrics service for Feature Card 3."""

from __future__ import annotations

from typing import Iterable

import numpy as np
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

DEMOGRAPHIC_COLUMNS: tuple[str, ...] = AGE_COLUMNS + GENDER_COLUMNS + PURPOSE_COLUMNS


def _validate_input(df: DataFrame) -> None:
    if "report_year" not in df.columns:
        raise ValueError("Canonical demographic DataFrame must include 'report_year'.")


def _to_numeric(df: DataFrame, columns: Iterable[str]) -> DataFrame:
    out = df.copy()
    for col in columns:
        if col in out.columns:
            out[col] = pd.to_numeric(out[col], errors="coerce").astype("Float64")
    return out


def _ensure_contiguous_years(df: DataFrame) -> DataFrame:
    out = df.copy().sort_values("report_year", ascending=True, kind="mergesort")
    out["report_year"] = pd.to_numeric(out["report_year"], errors="coerce").astype("Int64")
    out = out.dropna(subset=["report_year"]).copy()
    out["report_year"] = out["report_year"].astype(int)

    if out.empty:
        return out

    min_year = int(out["report_year"].min())
    max_year = int(out["report_year"].max())
    full_years = pd.Index(range(min_year, max_year + 1), name="report_year")
    out = out.set_index("report_year").reindex(full_years).reset_index()
    return out


def _add_yoy_columns(df: DataFrame, columns: Iterable[str]) -> DataFrame:
    out = df.copy()
    for col in columns:
        if col not in out.columns:
            continue
        prev = out[col].shift(1)
        valid = prev.notna() & out[col].notna() & (prev != 0)
        yoy = pd.Series(np.nan, index=out.index, dtype="Float64")
        yoy.loc[valid] = ((out.loc[valid, col] - prev.loc[valid]) / prev.loc[valid]) * 100.0
        out[f"{col}_yoy_pct"] = yoy.round(4)
    return out


def _add_rolling_averages(df: DataFrame, columns: Iterable[str], window: int = 3) -> DataFrame:
    out = df.copy()
    for col in columns:
        if col not in out.columns:
            continue
        out[f"{col}_rolling_{window}y_avg"] = (
            out[col].rolling(window=window, min_periods=1).mean().astype("Float64").round(4)
        )
    return out


def _add_share_columns(df: DataFrame, columns: tuple[str, ...], suffix: str = "_share_pct") -> DataFrame:
    out = df.copy()
    existing = [col for col in columns if col in out.columns]
    if not existing:
        return out

    totals = out[existing].sum(axis=1, skipna=True)
    for col in existing:
        share = pd.Series(np.nan, index=out.index, dtype="Float64")
        valid = totals.notna() & (totals > 0) & out[col].notna()
        share.loc[valid] = (out.loc[valid, col] / totals.loc[valid]) * 100.0
        out[f"{col}{suffix}"] = share.round(4)
    return out


def build_demographic_trend_metrics(canonical_df: DataFrame) -> DataFrame:
    """Compute longitudinal demographic metrics for charting and alerting."""
    _validate_input(canonical_df)

    out = canonical_df.copy()
    out = _ensure_contiguous_years(out)
    out = _to_numeric(out, DEMOGRAPHIC_COLUMNS)

    out = _add_yoy_columns(out, DEMOGRAPHIC_COLUMNS)
    out = _add_rolling_averages(out, DEMOGRAPHIC_COLUMNS, window=3)

    out = _add_share_columns(out, AGE_COLUMNS)
    out = _add_share_columns(out, GENDER_COLUMNS)
    out = _add_share_columns(out, PURPOSE_COLUMNS)

    return out


__all__ = ["build_demographic_trend_metrics"]

