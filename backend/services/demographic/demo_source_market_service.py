"""Source market analytics service for Feature Card 3: Demographic Cohort Tracker.

Builds longitudinal source-market analytics from the canonical demographic
DataFrame, which stores a 'top_source_markets' column as a list of ranked
market names per year.

Outputs a dictionary of DataFrames:
    - yearly_top_market_table: long-format table of (year, rank, source_market)
    - market_presence_frequency: count of years each market appeared in top list
    - source_market_heatmap: pivot(market x year) of rank position (NaN = absent)
    - rising_source_market_alerts: markets with improving (lower) rank positions
"""

from __future__ import annotations

import pandas as pd
from pandas import DataFrame


def build_source_market_analytics(canonical_df: DataFrame) -> dict[str, DataFrame]:
    """Build all source-market analytics from the canonical demographic DataFrame.

    Args:
        canonical_df: Canonical annual demographic DataFrame from
            ``transform_demographic_annual``. Must contain 'report_year' and
            'top_source_markets' (a list of strings per row).

    Returns:
        Dict with keys: ``yearly_top_market_table``, ``market_presence_frequency``,
        ``source_market_heatmap``, ``rising_source_market_alerts``.
    """
    # ── Guard ──────────────────────────────────────────────────────────────────
    if canonical_df.empty or "top_source_markets" not in canonical_df.columns:
        empty = DataFrame()
        return {
            "yearly_top_market_table": empty,
            "market_presence_frequency": empty,
            "source_market_heatmap": empty,
            "rising_source_market_alerts": empty,
        }

    # ── Build long-format yearly table ────────────────────────────────────────
    records: list[dict] = []
    for _, row in canonical_df.sort_values("report_year", ascending=True).iterrows():
        year = int(row["report_year"])
        markets = row.get("top_source_markets")
        if not isinstance(markets, list):
            continue
        for rank, market in enumerate(markets, start=1):
            market_name = str(market).strip()
            if not market_name:
                continue
            records.append(
                {
                    "report_year": year,
                    "rank": rank,
                    "source_market": market_name,
                }
            )

    if not records:
        empty = DataFrame()
        return {
            "yearly_top_market_table": empty,
            "market_presence_frequency": empty,
            "source_market_heatmap": empty,
            "rising_source_market_alerts": empty,
        }

    yearly_table = DataFrame.from_records(records)

    # ── Market presence frequency ──────────────────────────────────────────────
    frequency = (
        yearly_table.groupby("source_market")["report_year"]
        .count()
        .reset_index()
        .rename(columns={"report_year": "years_present"})
        .sort_values("years_present", ascending=False)
    )

    # ── Source market heatmap: pivot(market × year) with rank values ───────────
    # Lower rank = better (1 = top market). NaN = not in top list that year.
    heatmap = yearly_table.pivot_table(
        index="source_market",
        columns="report_year",
        values="rank",
        aggfunc="min",
    )
    heatmap.columns.name = None
    heatmap.index.name = "source_market"

    # ── Rising source market alerts ────────────────────────────────────────────
    # A market is "rising" if its rank improved (numerically decreased) YoY.
    alert_records: list[dict] = []
    for market, grp in yearly_table.groupby("source_market"):
        grp = grp.sort_values("report_year").copy()
        grp["prev_rank"] = grp["rank"].shift(1)
        rising = grp[grp["prev_rank"].notna() & (grp["rank"] < grp["prev_rank"])]
        for _, r in rising.iterrows():
            improvement = int(r["prev_rank"]) - int(r["rank"])
            alert_records.append(
                {
                    "source_market": market,
                    "report_year": int(r["report_year"]),
                    "current_rank": int(r["rank"]),
                    "previous_rank": int(r["prev_rank"]),
                    "rank_improvement": improvement,
                    "alert_level": "HIGH" if improvement >= 3 else ("MEDIUM" if improvement >= 2 else "INFO"),
                    "rationale": (
                        f"{market} improved from rank {int(r['prev_rank'])} to "
                        f"{int(r['rank'])} (+{improvement} positions)"
                    ),
                }
            )

    rising_alerts = (
        DataFrame.from_records(alert_records)
        .sort_values(["report_year", "rank_improvement"], ascending=[False, False])
        .reset_index(drop=True)
        if alert_records
        else DataFrame()
    )

    return {
        "yearly_top_market_table": yearly_table,
        "market_presence_frequency": frequency,
        "source_market_heatmap": heatmap,
        "rising_source_market_alerts": rising_alerts,
    }


__all__ = ["build_source_market_analytics"]
