"""Demographic transformation service for Feature Card 3."""

from __future__ import annotations

import re
from typing import Iterable

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


def _to_numeric(df: DataFrame, columns: Iterable[str]) -> DataFrame:
    out = df.copy()
    for col in columns:
        if col in out.columns:
            out[col] = pd.to_numeric(out[col], errors="coerce").astype("Float64")
    return out


def _normalize_market_name(value: str) -> str:
    cleaned = re.sub(r"^\s*\d+\s*[\.\):-]?\s*", "", value.strip())
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned


def _parse_top_source_markets(value: object) -> list[str]:
    if isinstance(value, list):
        tokens = [str(v).strip() for v in value if str(v).strip()]
    elif pd.isna(value):
        tokens = []
    else:
        text = str(value).strip()
        if not text:
            tokens = []
        else:
            tokens = [part.strip() for part in re.split(r"[,\|;/]+", text) if part.strip()]

    normalized: list[str] = []
    seen: set[str] = set()
    for token in tokens:
        market = _normalize_market_name(token)
        if not market:
            continue
        lower = market.lower()
        if lower in seen:
            continue
        seen.add(lower)
        normalized.append(market)
    return normalized


def _dominant_column(row: pd.Series, columns: tuple[str, ...]) -> str | None:
    values = pd.to_numeric(row[list(columns)], errors="coerce")
    if values.isna().all():
        return None
    return str(values.idxmax())


def transform_demographic_annual(df: DataFrame) -> DataFrame:
    """Transform cleaned demographic CSV rows into canonical annual records."""
    if "report_year" not in df.columns:
        raise ValueError("Input demographic DataFrame must include 'report_year'.")

    out = df.copy()
    out["report_year"] = pd.to_numeric(out["report_year"], errors="coerce").astype("Int64")
    out = out.dropna(subset=["report_year"]).copy()
    out["report_year"] = out["report_year"].astype(int)

    numeric_cols = AGE_COLUMNS + GENDER_COLUMNS + PURPOSE_COLUMNS
    out = _to_numeric(out, numeric_cols)

    if "top_source_markets" not in out.columns:
        out["top_source_markets"] = pd.Series([[] for _ in range(len(out))], dtype="object")
    out["top_source_markets"] = out["top_source_markets"].apply(_parse_top_source_markets)

    if "note" not in out.columns:
        out["note"] = pd.Series([pd.NA] * len(out), dtype="string")
    out["note"] = out["note"].astype("string")

    out["dominant_age_cohort"] = out.apply(
        lambda row: _dominant_column(row, AGE_COLUMNS), axis=1
    )
    out["dominant_purpose"] = out.apply(
        lambda row: _dominant_column(row, PURPOSE_COLUMNS), axis=1
    )

    male = pd.to_numeric(out["gender_male"], errors="coerce")
    female = pd.to_numeric(out["gender_female"], errors="coerce")
    out["male_female_gap_pct"] = (male - female).astype("Float64").round(4)

    out["age_data_available"] = out[list(AGE_COLUMNS)].notna().any(axis=1)
    out["purpose_data_available"] = out[list(PURPOSE_COLUMNS)].notna().any(axis=1)
    out["gender_data_available"] = out[list(GENDER_COLUMNS)].notna().any(axis=1)
    out["source_market_count"] = out["top_source_markets"].apply(lambda x: len(x) if isinstance(x, list) else 0)

    out = out.sort_values("report_year", ascending=True, kind="mergesort").reset_index(drop=True)
    return out


__all__ = ["transform_demographic_annual"]

