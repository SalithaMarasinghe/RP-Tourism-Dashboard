import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd

from models.source_markets_models import (
    BarChartRaceResponse,
    ChoroplethFrame,
    ChoroplethResponse,
    CountryBCR,
    CountryChoropleth,
    CountrySparkline,
    SparklineData,
    SparklineKPIs,
    SparklineSummary,
    SparklineTableResponse,
)

logger = logging.getLogger(__name__)

# ── Paths ─────────────────────────────────────────────────────────────────────

DATA_DIR = Path(__file__).parent.parent / "forecasts" / "data"
BCR_CSV_PATH = DATA_DIR / "layer1_bcr_wide_flourish.csv"
LONG_CSV_PATH = DATA_DIR / "layer1_long_format.csv"
SEGMENTS_CSV_PATH = DATA_DIR / "source_market_segments.csv"

# ── Static Metadata ───────────────────────────────────────────────────────────

COUNTRY_METADATA: Dict[str, Dict[str, str]] = {
    "India":       {"iso3": "IND", "segment": "Mature",    "color": "#FF6B35"},
    "Russia":      {"iso3": "RUS", "segment": "Mature",    "color": "#E63946"},
    "UK":          {"iso3": "GBR", "segment": "Mature",    "color": "#457B9D"},
    "Germany":     {"iso3": "DEU", "segment": "Mature",    "color": "#2A9D8F"},
    "China":       {"iso3": "CHN", "segment": "Emerging",  "color": "#E9C46A"},
    "France":      {"iso3": "FRA", "segment": "Mature",    "color": "#8338EC"},
    "Australia":   {"iso3": "AUS", "segment": "Mature",    "color": "#06D6A0"},
    "USA":         {"iso3": "USA", "segment": "Mature",    "color": "#118AB2"},
    "Netherlands": {"iso3": "NLD", "segment": "Mature",    "color": "#FFB703"},
    "Maldives":    {"iso3": "MDV", "segment": "Declining", "color": "#FB8500"},
    "Bangladesh":  {"iso3": "BGD", "segment": "Emerging",  "color": "#80B918"},
    "Poland":      {"iso3": "POL", "segment": "Emerging",  "color": "#F72585"},
    "Japan":       {"iso3": "JPN", "segment": "Declining", "color": "#7209B7"},
    "Canada":      {"iso3": "CAN", "segment": "Mature",    "color": "#3A86FF"},
    "Ukraine":     {"iso3": "UKR", "segment": "Declining", "color": "#FFBE0B"},
}

YEAR_ANNOTATIONS: Dict[int, str] = {
    2018: "📈 Peak Year — 2.33M total arrivals",
    2019: "⚠️ Easter Sunday Attack — arrivals fell 18%",
    2020: "🦠 COVID-19 — arrivals collapsed 73.5%",
    2021: "🦠 COVID-19 continues — lowest: 194K arrivals",
    2022: "✈️ Recovery begins — +270% YoY",
    2024: "🏆 Post-COVID record — 2.05M arrivals",
}

_SEGMENTS_TO_LONG: Dict[str, str] = {
    "United Kingdom": "UK",
    "United States":  "USA",
}

_FLAGS: Dict[str, str] = {
    "India":       "🇮🇳",
    "Russia":      "🇷🇺",
    "UK":          "🇬🇧",
    "Germany":     "🇩🇪",
    "China":       "🇨🇳",
    "France":      "🇫🇷",
    "Australia":   "🇦🇺",
    "USA":         "🇺🇸",
    "Netherlands": "🇳🇱",
    "Maldives":    "🇲🇻",
    "Bangladesh":  "🇧🇩",
    "Poland":      "🇵🇱",
    "Japan":       "🇯🇵",
    "Canada":      "🇨🇦",
    "Ukraine":     "🇺🇦",
}

_SEGMENT_ORDER = {"Mature": 0, "Emerging": 1, "Declining": 2, "Unknown": 3}


# ── Service Methods ───────────────────────────────────────────────────────────

def get_bar_chart_race_data() -> Optional[BarChartRaceResponse]:
    """Read and parse the CSV, returning the full struct for bar chart race."""
    if not BCR_CSV_PATH.exists():
        logger.error("BCR CSV not found at %s", BCR_CSV_PATH)
        return None

    df = pd.read_csv(BCR_CSV_PATH)

    year_cols = [c for c in df.columns if str(c).strip().isdigit()]
    years = sorted(int(y) for y in year_cols)

    countries_out: List[CountryBCR] = []
    
    # Process each country
    for _, row in df.iterrows():
        country_name = str(row["Country"]).strip()
        meta = COUNTRY_METADATA.get(country_name, {
            "iso3": "UNK", "segment": "Other", "color": "#AAAAAA"
        })

        arrivals: Dict[str, Optional[int]] = {}
        for yr in year_cols:
            raw = row[yr]
            arrivals[yr.strip()] = None if (pd.isna(raw) or raw == "") else int(float(raw))

        countries_out.append(
            CountryBCR(
                country=country_name,
                iso3=meta["iso3"],
                segment=meta["segment"],
                color=meta["color"],
                arrivals=arrivals,
            )
        )

    # Compute top-10 rankings per year
    rankings: Dict[str, List[str]] = {}
    for yr in year_cols:
        yr_key = yr.strip()
        ranked = sorted(
            [c for c in countries_out if c.arrivals.get(yr_key) is not None],
            key=lambda c: c.arrivals[yr_key],
            reverse=True,
        )[:10]
        rankings[yr_key] = [c.country for c in ranked]

    return BarChartRaceResponse(
        years=years,
        countries=countries_out,
        rankings=rankings,
    )


def get_choropleth_data() -> Optional[ChoroplethResponse]:
    """Read the long-format CSV and build per-year frames for the choropleth."""
    if not LONG_CSV_PATH.exists():
        logger.error("Long-format CSV not found at %s", LONG_CSV_PATH)
        return None

    df = pd.read_csv(LONG_CSV_PATH)

    df["Year"] = df["Year"].astype(int)
    df["Arrivals"] = df["Arrivals"].astype(int)
    df["YoY_pct"] = pd.to_numeric(df["YoY_pct"], errors="coerce")
    df["Rank"] = df["Rank"].astype(int)

    years = sorted(df["Year"].unique().tolist())
    frames: List[ChoroplethFrame] = []

    for yr in years:
        yr_df = df[df["Year"] == yr].copy()
        if yr_df.empty:
            continue
            
        total = int(yr_df["Arrivals"].sum())
        top_row = yr_df.loc[yr_df["Arrivals"].idxmax()]
        markets_count = len(yr_df)

        country_data = []
        for _, row in yr_df.iterrows():
            yoy = None if pd.isna(row["YoY_pct"]) else float(row["YoY_pct"])
            country_data.append(
                CountryChoropleth(
                    country=str(row["Country"]),
                    iso3=str(row["ISO3"]),
                    arrivals=int(row["Arrivals"]),
                    yoy_pct=yoy,
                    segment=str(row["Segment"]),
                    rank=int(row["Rank"]),
                )
            )

        frames.append(
            ChoroplethFrame(
                year=yr,
                data=country_data,
                total_arrivals=total,
                top_market=str(top_row["Country"]),
                markets_tracked=markets_count,
                annotation=YEAR_ANNOTATIONS.get(yr),
            )
        )

    return ChoroplethResponse(years=years, frames=frames)


def get_sparkline_table_data() -> Optional[SparklineTableResponse]:
    """Join long-format + segments CSVs and compute per-country KPIs.
    Guarantees all 25 segmented countries are returned, even if history is missing."""
    if not LONG_CSV_PATH.exists():
        logger.error("Long-format CSV not found at %s", LONG_CSV_PATH)
        return None
    if not SEGMENTS_CSV_PATH.exists():
        logger.error("Segments CSV not found at %s", SEGMENTS_CSV_PATH)
        return None

    df_long = pd.read_csv(LONG_CSV_PATH)
    df_seg  = pd.read_csv(SEGMENTS_CSV_PATH)

    df_long["Year"]     = df_long["Year"].astype(int)
    df_long["Arrivals"] = df_long["Arrivals"].astype(int)
    df_long["YoY_pct"]  = pd.to_numeric(df_long["YoY_pct"], errors="coerce")
    df_long["Rank"]     = df_long["Rank"].astype(int)

    df_seg["CAGR_pct"]        = pd.to_numeric(df_seg["CAGR_pct"], errors="coerce")
    df_seg["Latest_Arrivals"] = pd.to_numeric(df_seg["Latest_Arrivals"], errors="coerce")
    df_seg["Peak_Year"]       = pd.to_numeric(df_seg["Peak_Year"], errors="coerce")

    # Group the historical time-series data by Country
    history_groups = dict(tuple(df_long.groupby("Country")))

    countries_out: List[CountrySparkline] = []

    # Iterate over ALL 25 countries defined in the segments file
    for _, row in df_seg.iterrows():
        c_seg_name = str(row["Country"])
        
        # Determine the name used in long_format.csv (e.g. "United Kingdom" -> "UK")
        c_long_name = _SEGMENTS_TO_LONG.get(c_seg_name, c_seg_name)
        
        segment    = str(row["Segment"])
        cluster_id = int(row["Cluster_ID"]) if pd.notna(row["Cluster_ID"]) else None
        confidence = str(row["Confidence"])
        color      = str(row["Color"])
        cagr_pct   = float(row["CAGR_pct"]) if pd.notna(row["CAGR_pct"]) else None
        
        # Static fallbacks from df_seg (for countries without history)
        fallback_latest = int(row["Latest_Arrivals"]) if pd.notna(row["Latest_Arrivals"]) else 0
        fallback_peak_yr = int(row["Peak_Year"]) if pd.notna(row["Peak_Year"]) else 2025

        sparkline = []
        peak_year = fallback_peak_yr
        peak_arr  = None
        latest_year = None
        latest_arr = fallback_latest
        yoy_pct = None
        best_yoy_year = None
        best_yoy_pct = None
        worst_yoy_year = None
        worst_yoy_pct = None
        years_in_top3 = 0
        total_years = 0
        iso3 = "UNK"
        
        # If we have historical data for this country, compute KPIs dynamically
        if c_long_name in history_groups:
            grp = history_groups[c_long_name]
            grp_sorted = grp.sort_values("Year")
            
            iso3 = str(grp_sorted.iloc[0]["ISO3"]) if "ISO3" in grp_sorted.columns else "UNK"
            
            sparkline = [
                SparklineData(year=int(r["Year"]), arrivals=int(r["Arrivals"]))
                for _, r in grp_sorted.iterrows()
            ]

            # Latest year KPIs
            latest_row  = grp_sorted.iloc[-1]
            latest_year = int(latest_row["Year"])
            latest_arr  = int(latest_row["Arrivals"])
            yoy_pct     = float(latest_row["YoY_pct"]) if pd.notna(latest_row["YoY_pct"]) else None

            # Peak
            peak_idx  = grp_sorted["Arrivals"].idxmax()
            peak_row  = grp_sorted.loc[peak_idx]
            peak_year = int(peak_row["Year"])
            peak_arr  = int(peak_row["Arrivals"])

            # Best / worst YoY
            yoy_data = grp_sorted.dropna(subset=["YoY_pct"])
            if len(yoy_data) > 0:
                best_row      = yoy_data.loc[yoy_data["YoY_pct"].idxmax()]
                worst_row     = yoy_data.loc[yoy_data["YoY_pct"].idxmin()]
                best_yoy_year  = int(best_row["Year"])
                best_yoy_pct   = round(float(best_row["YoY_pct"]), 2)
                worst_yoy_year = int(worst_row["Year"])
                worst_yoy_pct  = round(float(worst_row["YoY_pct"]), 2)

            years_in_top3 = int((grp_sorted["Rank"] <= 3).sum())
            total_years   = len(grp_sorted)

        countries_out.append(
            CountrySparkline(
                country=c_seg_name, # Note: using the full name, not the short alias
                iso3=iso3,
                flag_emoji=_FLAGS.get(c_long_name, "🏳"),
                segment=segment,
                cluster_id=cluster_id,
                confidence=confidence,
                color=color,
                sparkline=sparkline,
                kpis=SparklineKPIs(
                    peak_year=peak_year,
                    peak_arrivals=peak_arr,
                    latest_year=latest_year,
                    latest_arrivals=latest_arr,
                    yoy_pct=yoy_pct,
                    cagr_pct=cagr_pct,
                    best_yoy_year=best_yoy_year,
                    best_yoy_pct=best_yoy_pct,
                    worst_yoy_year=worst_yoy_year,
                    worst_yoy_pct=worst_yoy_pct,
                    years_in_top3=years_in_top3,
                    total_years=total_years,
                ),
            )
        )

    # Sort
    countries_out.sort(
        key=lambda c: (
            _SEGMENT_ORDER.get(c.segment, 99),
            -c.kpis.latest_arrivals,
        )
    )

    seg_counts: Dict[str, int] = {"Mature": 0, "Emerging": 0, "Declining": 0, "Unknown": 0}
    for c in countries_out:
        seg_counts[c.segment] = seg_counts.get(c.segment, 0) + 1

    return SparklineTableResponse(
        countries=countries_out,
        summary=SparklineSummary(
            total_countries=len(countries_out),
            mature_count=seg_counts["Mature"],
            emerging_count=seg_counts["Emerging"],
            declining_count=seg_counts["Declining"],
            unknown_count=seg_counts.get("Unknown", 0),
        )
    )
