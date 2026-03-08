"""Rule-based rising segment alert engine for Demographic Cohort Tracker.

This module detects rising demographic segments from annual trend data using
simple, auditable rules:
1. YoY increase above threshold
2. Consecutive increases across multiple years
3. Current value above rolling average
"""

from __future__ import annotations

from typing import Iterable

import numpy as np
import pandas as pd
from pandas import DataFrame, Series


AGE_COHORT_COLUMNS: tuple[str, ...] = (
    "age_below_10",
    "age_10_19",
    "age_20_29",
    "age_30_39",
    "age_40_49",
    "age_50_59",
    "age_60_plus",
)

PURPOSE_COLUMNS: tuple[str, ...] = (
    "purpose_leisure",
    "purpose_business",
    "purpose_vfr",
    "purpose_transit",
    "purpose_other",
)

GENDER_SHARE_COLUMNS: tuple[str, ...] = (
    "gender_male_share_pct",
    "gender_female_share_pct",
)

ALERT_COLUMNS: tuple[str, ...] = (
    "segment_type",
    "segment_name",
    "report_year",
    "alert_level",
    "change_value",
    "rationale",
)

ALERT_LEVEL_ORDER: dict[str, int] = {"HIGH": 0, "MEDIUM": 1, "INFO": 2}


def _validate_input(df: DataFrame) -> None:
    """Validate minimum required input shape."""
    if "report_year" not in df.columns:
        raise ValueError("Trend DataFrame must include 'report_year'.")


def _to_numeric(df: DataFrame, columns: Iterable[str]) -> DataFrame:
    """Safely cast selected columns to numeric nullable floats."""
    out = df.copy()
    for col in columns:
        if col in out.columns:
            out[col] = pd.to_numeric(out[col], errors="coerce").astype("Float64")
    return out


def _ensure_yoy_and_rolling(
    df: DataFrame, metric_col: str, rolling_window: int = 3
) -> DataFrame:
    """Ensure `{metric}_yoy_pct` and `{metric}_rolling_{window}y_avg` exist."""
    out = df.copy()
    yoy_col = f"{metric_col}_yoy_pct"
    rolling_col = f"{metric_col}_rolling_{rolling_window}y_avg"

    if metric_col not in out.columns:
        out[metric_col] = pd.Series([pd.NA] * len(out), dtype="Float64")
    out = _to_numeric(out, [metric_col])

    if yoy_col not in out.columns:
        prev = out[metric_col].shift(1)
        valid = prev.notna() & (prev != 0) & out[metric_col].notna()
        yoy = pd.Series(np.nan, index=out.index, dtype="Float64")
        yoy.loc[valid] = ((out.loc[valid, metric_col] - prev.loc[valid]) / prev.loc[valid]) * 100.0
        out[yoy_col] = yoy.round(4)
    else:
        out = _to_numeric(out, [yoy_col])

    if rolling_col not in out.columns:
        out[rolling_col] = (
            out[metric_col]
            .rolling(window=rolling_window, min_periods=1)
            .mean()
            .astype("Float64")
            .round(4)
        )
    else:
        out = _to_numeric(out, [rolling_col])

    return out


def _consecutive_increase_flags(series: Series, consecutive_years: int) -> Series:
    """Return boolean flags where value has increased for N consecutive years."""
    if consecutive_years <= 1:
        return series.notna()

    increases = series.diff() > 0
    increases = increases.fillna(False).astype(int)
    flags = increases.rolling(window=consecutive_years, min_periods=consecutive_years).sum()
    return (flags >= consecutive_years).fillna(False)


def _classify_alert_level(rules_triggered: int, yoy_value: float | None, yoy_threshold: float) -> str:
    """Classify alert level from triggered rule count and YoY magnitude."""
    if rules_triggered >= 3 or (yoy_value is not None and yoy_value >= (2 * yoy_threshold)):
        return "HIGH"
    if rules_triggered >= 2:
        return "MEDIUM"
    return "INFO"


def _build_metric_alerts(
    trend_df: DataFrame,
    segment_type: str,
    metric_columns: Iterable[str],
    *,
    yoy_threshold: float,
    consecutive_years: int,
    rolling_window: int = 3,
) -> DataFrame:
    """Build alerts for a family of metric columns using common rule logic."""
    records: list[dict[str, object]] = []
    base = trend_df.sort_values("report_year", ascending=True, kind="mergesort").copy()

    for metric in metric_columns:
        df = _ensure_yoy_and_rolling(base, metric, rolling_window=rolling_window)
        yoy_col = f"{metric}_yoy_pct"
        rolling_col = f"{metric}_rolling_{rolling_window}y_avg"
        consecutive_flags = _consecutive_increase_flags(df[metric], consecutive_years)

        for idx, row in df.iterrows():
            year = row["report_year"]
            value = row.get(metric)
            yoy = row.get(yoy_col)
            rolling_avg = row.get(rolling_col)

            if pd.isna(year) or pd.isna(value):
                continue

            yoy_rule = bool(pd.notna(yoy) and yoy > yoy_threshold)
            consec_rule = bool(consecutive_flags.loc[idx])
            rolling_rule = bool(
                pd.notna(rolling_avg) and pd.notna(value) and float(value) > float(rolling_avg)
            )

            rules_triggered = int(yoy_rule) + int(consec_rule) + int(rolling_rule)
            if rules_triggered == 0:
                continue

            reasons: list[str] = []
            if yoy_rule:
                reasons.append(
                    f"YoY change {float(yoy):.2f}% exceeded threshold {yoy_threshold:.2f}%"
                )
            if consec_rule:
                reasons.append(f"Consecutive annual increases for at least {consecutive_years} years")
            if rolling_rule:
                reasons.append(
                    f"Current value {float(value):.2f} is above {rolling_window}-year rolling avg "
                    f"{float(rolling_avg):.2f}"
                )

            alert_level = _classify_alert_level(
                rules_triggered,
                float(yoy) if pd.notna(yoy) else None,
                yoy_threshold,
            )

            change_value = float(yoy) if pd.notna(yoy) else float(value) - float(rolling_avg or 0)

            records.append(
                {
                    "segment_type": segment_type,
                    "segment_name": metric,
                    "report_year": int(year),
                    "alert_level": alert_level,
                    "change_value": round(float(change_value), 4),
                    "rationale": "; ".join(reasons),
                }
            )

    if not records:
        return pd.DataFrame(columns=ALERT_COLUMNS)

    return pd.DataFrame.from_records(records, columns=ALERT_COLUMNS)


def detect_age_cohort_alerts(
    trend_df: DataFrame,
    *,
    yoy_threshold: float = 5.0,
    consecutive_years: int = 2,
    rolling_window: int = 3,
) -> DataFrame:
    """Detect rising age cohort segments."""
    return _build_metric_alerts(
        trend_df,
        segment_type="age_cohort",
        metric_columns=AGE_COHORT_COLUMNS,
        yoy_threshold=yoy_threshold,
        consecutive_years=consecutive_years,
        rolling_window=rolling_window,
    )


def detect_purpose_alerts(
    trend_df: DataFrame,
    *,
    yoy_threshold: float = 5.0,
    consecutive_years: int = 2,
    rolling_window: int = 3,
) -> DataFrame:
    """Detect rising purpose-of-visit segments."""
    return _build_metric_alerts(
        trend_df,
        segment_type="purpose",
        metric_columns=PURPOSE_COLUMNS,
        yoy_threshold=yoy_threshold,
        consecutive_years=consecutive_years,
        rolling_window=rolling_window,
    )


def detect_gender_balance_alerts(
    trend_df: DataFrame,
    *,
    yoy_threshold: float = 1.0,
    gap_yoy_threshold: float = 1.0,
    consecutive_years: int = 2,
    rolling_window: int = 3,
) -> DataFrame:
    """Detect gender balance shifts from share trends and gap widening."""
    base = trend_df.sort_values("report_year", ascending=True, kind="mergesort").copy()

    # Share-based alerts (male/female share movement).
    share_alerts = _build_metric_alerts(
        base,
        segment_type="gender_balance",
        metric_columns=[col for col in GENDER_SHARE_COLUMNS if col in base.columns],
        yoy_threshold=yoy_threshold,
        consecutive_years=consecutive_years,
        rolling_window=rolling_window,
    )

    # Gap-based alerts (absolute male-female share gap increases).
    gap_alert_records: list[dict[str, object]] = []
    if all(col in base.columns for col in GENDER_SHARE_COLUMNS):
        base = _to_numeric(base, GENDER_SHARE_COLUMNS)
        base["gender_share_gap_abs"] = (
            (base["gender_male_share_pct"] - base["gender_female_share_pct"]).abs().astype("Float64")
        )
        base = _ensure_yoy_and_rolling(base, "gender_share_gap_abs", rolling_window=rolling_window)
        yoy_col = "gender_share_gap_abs_yoy_pct"
        rolling_col = f"gender_share_gap_abs_rolling_{rolling_window}y_avg"
        consecutive_flags = _consecutive_increase_flags(base["gender_share_gap_abs"], consecutive_years)

        for idx, row in base.iterrows():
            year = row.get("report_year")
            gap_value = row.get("gender_share_gap_abs")
            yoy = row.get(yoy_col)
            rolling_avg = row.get(rolling_col)

            if pd.isna(year) or pd.isna(gap_value):
                continue

            yoy_rule = bool(pd.notna(yoy) and yoy > gap_yoy_threshold)
            consec_rule = bool(consecutive_flags.loc[idx])
            rolling_rule = bool(
                pd.notna(rolling_avg) and pd.notna(gap_value) and float(gap_value) > float(rolling_avg)
            )

            rules_triggered = int(yoy_rule) + int(consec_rule) + int(rolling_rule)
            if rules_triggered == 0:
                continue

            reasons: list[str] = []
            if yoy_rule:
                reasons.append(
                    f"Gender gap YoY change {float(yoy):.2f}% exceeded threshold "
                    f"{gap_yoy_threshold:.2f}%"
                )
            if consec_rule:
                reasons.append(
                    f"Gender share gap increased for at least {consecutive_years} consecutive years"
                )
            if rolling_rule:
                reasons.append(
                    f"Current gender share gap {float(gap_value):.2f} is above {rolling_window}-year "
                    f"rolling avg {float(rolling_avg):.2f}"
                )

            alert_level = _classify_alert_level(
                rules_triggered,
                float(yoy) if pd.notna(yoy) else None,
                gap_yoy_threshold,
            )
            change_value = float(yoy) if pd.notna(yoy) else float(gap_value) - float(rolling_avg or 0)

            gap_alert_records.append(
                {
                    "segment_type": "gender_balance",
                    "segment_name": "gender_share_gap_abs",
                    "report_year": int(year),
                    "alert_level": alert_level,
                    "change_value": round(float(change_value), 4),
                    "rationale": "; ".join(reasons),
                }
            )

    gap_alerts = (
        pd.DataFrame.from_records(gap_alert_records, columns=ALERT_COLUMNS)
        if gap_alert_records
        else pd.DataFrame(columns=ALERT_COLUMNS)
    )

    return pd.concat([share_alerts, gap_alerts], ignore_index=True)


def build_rising_segment_alerts(
    trend_df: DataFrame,
    *,
    age_yoy_threshold: float = 5.0,
    purpose_yoy_threshold: float = 5.0,
    gender_yoy_threshold: float = 1.0,
    gender_gap_yoy_threshold: float = 1.0,
    consecutive_years: int = 2,
    rolling_window: int = 3,
) -> DataFrame:
    """Generate all rising segment alerts as a canonical alert DataFrame."""
    _validate_input(trend_df)

    age_alerts = detect_age_cohort_alerts(
        trend_df,
        yoy_threshold=age_yoy_threshold,
        consecutive_years=consecutive_years,
        rolling_window=rolling_window,
    )
    purpose_alerts = detect_purpose_alerts(
        trend_df,
        yoy_threshold=purpose_yoy_threshold,
        consecutive_years=consecutive_years,
        rolling_window=rolling_window,
    )
    gender_alerts = detect_gender_balance_alerts(
        trend_df,
        yoy_threshold=gender_yoy_threshold,
        gap_yoy_threshold=gender_gap_yoy_threshold,
        consecutive_years=consecutive_years,
        rolling_window=rolling_window,
    )

    all_alerts = pd.concat([age_alerts, purpose_alerts, gender_alerts], ignore_index=True)
    if all_alerts.empty:
        return pd.DataFrame(columns=ALERT_COLUMNS)

    all_alerts["alert_level_rank"] = all_alerts["alert_level"].map(ALERT_LEVEL_ORDER).fillna(99)
    all_alerts = all_alerts.sort_values(
        by=["report_year", "alert_level_rank", "segment_type", "segment_name"],
        ascending=[False, True, True, True],
        kind="mergesort",
    ).reset_index(drop=True)
    all_alerts = all_alerts.drop(columns=["alert_level_rank"])
    return all_alerts


__all__ = [
    "AGE_COHORT_COLUMNS",
    "PURPOSE_COLUMNS",
    "GENDER_SHARE_COLUMNS",
    "detect_age_cohort_alerts",
    "detect_purpose_alerts",
    "detect_gender_balance_alerts",
    "build_rising_segment_alerts",
]

